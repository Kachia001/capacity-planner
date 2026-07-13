import { z } from 'zod'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { workItems, workItemStatusEvents } from '../../../db/schema'

const voidWorkItemSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

function parseWorkItemId(event: Parameters<typeof getRouterParam>[0]) {
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '올바른 작업 ID가 필요합니다.' })
  }

  return id
}

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const workItemId = parseWorkItemId(event)
  const body = voidWorkItemSchema.parse(await readBody(event))
  const db = useDb()
  const now = new Date()

  return await db.transaction(async tx => {
    const [current] = await tx
      .select({ status: workItems.status })
      .from(workItems)
      .where(and(eq(workItems.id, workItemId), isNull(workItems.voidedAt)))
      .limit(1)

    if (!current) {
      throw createError({ statusCode: 404, statusMessage: '작업을 찾을 수 없습니다.' })
    }

    const [updated] = await tx
      .update(workItems)
      .set({
        voidedBy: profile.authUserId,
        voidedAt: now,
        voidReason: body.reason,
        version: sql`${workItems.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.status, current.status),
          isNull(workItems.voidedAt),
        ),
      )
      .returning({
        id: workItems.id,
        status: workItems.status,
        voidedAt: workItems.voidedAt,
        version: workItems.version,
      })

    if (!updated) {
      throw createError({
        statusCode: 409,
        statusMessage: '다른 사용자가 먼저 작업 상태를 변경했습니다.',
      })
    }

    await tx.insert(workItemStatusEvents).values({
      workItemId,
      fromStatus: current.status,
      toStatus: current.status,
      action: 'void',
      actorUserId: profile.authUserId,
      actorRoleSnapshot: profile.role,
      reason: body.reason,
    })

    return updated
  })
})
