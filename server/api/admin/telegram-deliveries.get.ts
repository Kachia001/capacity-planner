import { desc, sql } from 'drizzle-orm'
import { telegramDeliveryOutbox } from '#server/db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  const db = useDb()
  const [summaryRows, deliveries] = await Promise.all([
    db
      .select({
        status: telegramDeliveryOutbox.status,
        count: sql<number>`count(*)::int`,
      })
      .from(telegramDeliveryOutbox)
      .groupBy(telegramDeliveryOutbox.status),
    db
      .select({
        id: telegramDeliveryOutbox.id,
        workItemId: telegramDeliveryOutbox.workItemId,
        issueId: telegramDeliveryOutbox.issueId,
        status: telegramDeliveryOutbox.status,
        attemptCount: telegramDeliveryOutbox.attemptCount,
        nextAttemptAt: telegramDeliveryOutbox.nextAttemptAt,
        lastAttemptAt: telegramDeliveryOutbox.lastAttemptAt,
        lastErrorCode: telegramDeliveryOutbox.lastErrorCode,
        lastErrorMessage: telegramDeliveryOutbox.lastErrorMessage,
        telegramMessageId: telegramDeliveryOutbox.telegramMessageId,
        sentAt: telegramDeliveryOutbox.sentAt,
        createdAt: telegramDeliveryOutbox.createdAt,
      })
      .from(telegramDeliveryOutbox)
      .orderBy(desc(telegramDeliveryOutbox.createdAt))
      .limit(20),
  ])
  const summary = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  }

  for (const row of summaryRows) {
    summary[row.status] = row.count
  }

  return {
    summary,
    deliveries: deliveries.map(delivery => ({
      ...delivery,
      nextAttemptAt: delivery.nextAttemptAt.toISOString(),
      lastAttemptAt: delivery.lastAttemptAt?.toISOString() ?? null,
      sentAt: delivery.sentAt?.toISOString() ?? null,
      createdAt: delivery.createdAt.toISOString(),
    })),
  }
})
