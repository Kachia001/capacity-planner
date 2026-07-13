import { and, eq, isNull, sql } from 'drizzle-orm'
import { workItems, workItemStatusEvents } from '../../../db/schema'

function parseWorkItemId(event: Parameters<typeof getRouterParam>[0]) {
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '올바른 작업 ID가 필요합니다.' })
  }

  return id
}

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
  const workItemId = parseWorkItemId(event)
  const db = useDb()
  const now = new Date()

  return await db.transaction(async tx => {
    const [updated] = await tx
      .update(workItems)
      .set({
        status: 'in_progress',
        startedBy: profile.authUserId,
        startedAt: now,
        completedBy: null,
        completedAt: null,
        worker: profile.displayName?.trim() || profile.email,
        workDate: sql`CURRENT_DATE`,
        isCompleted: false,
        version: sql`${workItems.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.status, 'not_started'),
          isNull(workItems.voidedAt),
        ),
      )
      .returning({
        id: workItems.id,
        status: workItems.status,
        startedBy: workItems.startedBy,
        startedAt: workItems.startedAt,
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
        statusMessage: '이미 다른 작업자가 시작했거나 처리된 작업입니다.',
      })
    }

    await tx.insert(workItemStatusEvents).values({
      workItemId,
      fromStatus: 'not_started',
      toStatus: 'in_progress',
      action: 'start',
      actorUserId: profile.authUserId,
      actorRoleSnapshot: profile.role,
    })

    return updated
  })
})
