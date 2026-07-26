import { z } from 'zod'
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm'
import { bays, telegramDeliveryOutbox, telegramSettings, workItems } from '#server/db/schema'

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
  const parsedBody = issueSchema.safeParse(await readBody(event))

  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsedBody.error.issues[0]?.message ?? '이슈 입력값을 확인해 주세요.',
    })
  }

  const body = parsedBody.data
  const db = useDb()
  const now = new Date()

  const issue = await db.transaction(async tx => {
    const rateLimitWindow = new Date(now.getTime() - 60_000)
    const [recent] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(telegramDeliveryOutbox)
      .where(
        and(
          eq(telegramDeliveryOutbox.requestedBy, profile.authUserId),
          gte(telegramDeliveryOutbox.createdAt, rateLimitWindow),
        ),
      )

    if ((recent?.count ?? 0) >= 5) {
      throw createError({
        statusCode: 429,
        statusMessage: '이슈는 1분에 최대 5건까지 등록할 수 있습니다. 잠시 후 다시 시도해 주세요.',
      })
    }

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

    const [settings] = await tx
      .select({ isEnabled: telegramSettings.isEnabled })
      .from(telegramSettings)
      .where(eq(telegramSettings.id, 1))
      .limit(1)
    const deliveryStatus = settings?.isEnabled ? 'pending' : 'skipped'
    const skippedReason = settings ? 'disabled' : 'not_configured'
    const [delivery] = await tx
      .insert(telegramDeliveryOutbox)
      .values({
        workItemId,
        issueVersion: updated.version,
        requestedBy: profile.authUserId,
        payload: {
          bayCode: current.bayCode,
          workItemId,
          workNo: current.workNo,
          workName: current.workName,
          workDetail: current.workDetail,
          partNo: current.partNo,
          isHighAltitude: current.isHighAltitude,
          severity: body.severity,
          note: body.note,
          reporterName: profile.displayName?.trim() || profile.email,
          reporterRole: profile.role,
          createdAt: now.toISOString(),
        },
        status: deliveryStatus,
        lastErrorCode: deliveryStatus === 'skipped' ? skippedReason : null,
        lastErrorMessage:
          deliveryStatus === 'skipped'
            ? skippedReason === 'disabled'
              ? 'Telegram 알림이 비활성화되어 있습니다.'
              : 'Telegram 설정이 없습니다.'
            : null,
        updatedAt: now,
      })
      .returning({
        id: telegramDeliveryOutbox.id,
        status: telegramDeliveryOutbox.status,
        lastErrorCode: telegramDeliveryOutbox.lastErrorCode,
      })

    if (!delivery) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Telegram 전송 대기 항목을 생성하지 못했습니다.',
      })
    }

    return { current, updated, delivery }
  })

  const telegram =
    issue.delivery.status === 'pending'
      ? { status: 'queued' as const, deliveryId: issue.delivery.id }
      : {
          status: 'skipped' as const,
          reason: issue.delivery.lastErrorCode as 'not_configured' | 'disabled',
          deliveryId: issue.delivery.id,
        }

  return {
    item: issue.updated,
    telegram,
  }
})
