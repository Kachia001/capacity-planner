import { and, eq, isNull, sql } from 'drizzle-orm'
import { workItems, workItemStatusEvents } from '../../../db/schema'
import { canCompleteWorkItem } from '../../../utils/work-item-policy'

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
    const [current] = await tx
      .select({
        status: workItems.status,
        startedBy: workItems.startedBy,
        voidedAt: workItems.voidedAt,
      })
      .from(workItems)
      .where(eq(workItems.id, workItemId))
      .limit(1)

    if (!current || current.voidedAt) {
      throw createError({ statusCode: 404, statusMessage: '작업을 찾을 수 없습니다.' })
    }

    if (current.status !== 'in_progress') {
      throw createError({
        statusCode: 409,
        statusMessage: '작업 중 상태의 작업만 완료할 수 있습니다.',
      })
    }

    if (!canCompleteWorkItem(profile.role, profile.authUserId, current.startedBy)) {
      throw createError({
        statusCode: 403,
        statusMessage: '본인이 시작한 작업만 완료할 수 있습니다.',
      })
    }

    const completionConditions = [
      eq(workItems.id, workItemId),
      eq(workItems.status, 'in_progress'),
      isNull(workItems.voidedAt),
    ]

    if (profile.role === 'worker') {
      completionConditions.push(eq(workItems.startedBy, profile.authUserId))
    }

    const [updated] = await tx
      .update(workItems)
      .set({
        status: 'completed',
        completedBy: profile.authUserId,
        completedAt: now,
        isCompleted: true,
        version: sql`${workItems.version} + 1`,
        updatedAt: now,
      })
      .where(and(...completionConditions))
      .returning({
        id: workItems.id,
        status: workItems.status,
        completedBy: workItems.completedBy,
        completedAt: workItems.completedAt,
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
      fromStatus: 'in_progress',
      toStatus: 'completed',
      action: 'complete',
      actorUserId: profile.authUserId,
      actorRoleSnapshot: profile.role,
    })

    return updated
  })
})
