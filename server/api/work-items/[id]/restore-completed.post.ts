import { z } from 'zod'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { workItems, workItemStatusEvents } from '#server/db/schema'
import { canRestoreCompletedWorkItem } from '#server/utils/work-item-policy'

const restoreCompletedSchema = z.object({
  targetStatus: z.enum(['not_started', 'in_progress']),
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
  const body = restoreCompletedSchema.parse(await readBody(event))

  if (!canRestoreCompletedWorkItem(profile.role, body.targetStatus)) {
    throw createError({ statusCode: 403, statusMessage: '완료 작업을 복구할 권한이 없습니다.' })
  }

  const db = useDb()
  const now = new Date()
  const resetStartedFields =
    body.targetStatus === 'not_started'
      ? {
          startedBy: null,
          startedAt: null,
          worker: null,
          workDate: null,
        }
      : {}

  return await db.transaction(async tx => {
    const [updated] = await tx
      .update(workItems)
      .set({
        ...resetStartedFields,
        status: body.targetStatus,
        completedBy: null,
        completedAt: null,
        isCompleted: false,
        version: sql`${workItems.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(workItems.id, workItemId),
          eq(workItems.status, 'completed'),
          isNull(workItems.voidedAt),
        ),
      )
      .returning({
        id: workItems.id,
        status: workItems.status,
        startedBy: workItems.startedBy,
        startedAt: workItems.startedAt,
        completedBy: workItems.completedBy,
        completedAt: workItems.completedAt,
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
        statusMessage: '완료 상태의 작업만 작업 중 또는 대기로 복구할 수 있습니다.',
      })
    }

    await tx.insert(workItemStatusEvents).values({
      workItemId,
      fromStatus: 'completed',
      toStatus: body.targetStatus,
      action: 'restore',
      actorUserId: profile.authUserId,
      actorRoleSnapshot: profile.role,
      reason: body.reason,
    })

    return updated
  })
})
