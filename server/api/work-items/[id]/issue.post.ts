import { z } from 'zod'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { bays, workItems } from '#server/db/schema'
import { sendTelegramIssueNotification } from '#server/utils/telegram'

const issueSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  note: z.string().trim().min(3).max(1000),
})

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
  const body = issueSchema.parse(await readBody(event))
  const db = useDb()
  const now = new Date()

  const issue = await db.transaction(async tx => {
    const [current] = await tx
      .select({
        id: workItems.id,
        bayCode: bays.code,
        workNo: workItems.workNo,
        workName: workItems.workName,
        workDetail: workItems.workDetail,
        partNo: workItems.partNo,
        isHighAltitude: workItems.isHighAltitude,
        hasIssue: workItems.hasIssue,
        issueStatus: workItems.issueStatus,
        voidedAt: workItems.voidedAt,
      })
      .from(workItems)
      .innerJoin(bays, eq(workItems.bayId, bays.id))
      .where(eq(workItems.id, workItemId))
      .limit(1)

    if (!current || current.voidedAt) {
      throw createError({ statusCode: 404, statusMessage: '작업을 찾을 수 없습니다.' })
    }

    if (current.hasIssue && current.issueStatus !== 'resolved') {
      throw createError({
        statusCode: 409,
        statusMessage: '이 작업에는 이미 확인이 필요한 이슈가 등록되어 있습니다.',
      })
    }

    const [updated] = await tx
      .update(workItems)
      .set({
        hasIssue: true,
        issueStatus: 'open',
        issueSeverity: body.severity,
        issueNote: body.note,
        issueCreatedAt: now,
        issueCreatedBy: profile.authUserId,
        issueResolvedAt: null,
        issueResolvedBy: null,
        version: sql`${workItems.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(workItems.id, workItemId),
          isNull(workItems.voidedAt),
          or(eq(workItems.hasIssue, false), eq(workItems.issueStatus, 'resolved')),
        ),
      )
      .returning({
        id: workItems.id,
        hasIssue: workItems.hasIssue,
        issueStatus: workItems.issueStatus,
        issueSeverity: workItems.issueSeverity,
        issueNote: workItems.issueNote,
        issueCreatedAt: workItems.issueCreatedAt,
        version: workItems.version,
      })

    if (!updated) {
      throw createError({
        statusCode: 409,
        statusMessage: '다른 사용자가 먼저 이 작업에 이슈를 등록했습니다.',
      })
    }

    return { current, updated }
  })

  const telegram = await sendTelegramIssueNotification({
    bayCode: issue.current.bayCode,
    workItemId,
    workNo: issue.current.workNo,
    workName: issue.current.workName,
    workDetail: issue.current.workDetail,
    partNo: issue.current.partNo,
    isHighAltitude: issue.current.isHighAltitude,
    severity: body.severity,
    note: body.note,
    reporterName: profile.displayName?.trim() || profile.email,
    reporterRole: profile.role,
    createdAt: now,
  })

  return {
    item: issue.updated,
    telegram,
  }
})
