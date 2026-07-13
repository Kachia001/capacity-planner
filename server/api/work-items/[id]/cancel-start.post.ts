import { z } from 'zod'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { workItems, workItemStatusEvents } from '../../../db/schema'

const cancelStartSchema = z.object({
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
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const workItemId = parseWorkItemId(event)
  const body = cancelStartSchema.parse(await readBody(event))
  const db = useDb()
  const now = new Date()

  return await db.transaction(async tx => {
    const [updated] = await tx
      .update(workItems)
      .set({
        status: 'not_started',
        startedBy: null,
        startedAt: null,
        completedBy: null,
        completedAt: null,
        worker: null,
        workDate: null,
        isCompleted: false,
        version: sql`${workItems.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.status, 'in_progress'),
          isNull(workItems.voidedAt),
        ),
      )
      .returning({
        id: workItems.id,
        status: workItems.status,
        version: workItems.version,
      })

    if (!updated) {
      const [current] = await tx
        .select({ status: workItems.status, voidedAt: workItems.voidedAt })
        .from(workItems)
        .where(eq(workItems.id, workItemId))
        .limit(1)

      if (!current || current.voidedAt) {
        throw createError({ statusCode: 404, statusMessage: '작업을 찾을 수 없습니다.' })
      }

      throw createError({
        statusCode: 409,
        statusMessage: '작업 중 상태의 작업만 시작 취소할 수 있습니다.',
      })
    }

    await tx.insert(workItemStatusEvents).values({
      workItemId,
      fromStatus: 'in_progress',
      toStatus: 'not_started',
      action: 'cancel_start',
      actorUserId: profile.authUserId,
      actorRoleSnapshot: profile.role,
      reason: body.reason,
    })

    return updated
  })
})
