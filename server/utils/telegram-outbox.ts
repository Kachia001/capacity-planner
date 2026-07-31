import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { telegramDeliveryOutbox } from '../db/schema'
import { sendTelegramIssueNotification, type TelegramIssueMessage } from './telegram'

const MAX_ATTEMPTS = 5
const PROCESSING_LEASE_MS = 5 * 60 * 1000
const RETRY_DELAYS_SECONDS = [30, 120, 600, 1800, 3600] as const
const issuePayloadSchema = z.object({
  bayCode: z.string().min(1),
  workItemId: z.number().int().positive(),
  workNo: z.number().int().nullable(),
  workName: z.string().nullable(),
  workDetail: z.string().nullable(),
  partNo: z.string().nullable(),
  isHighAltitude: z.boolean(),
  category: z.enum(['material_shortage', 'work_delay', 'quality_issue', 'other']),
  note: z.string().min(3).max(1000),
  reporterName: z.string().min(1),
  reporterRole: z.enum(['admin', 'manager', 'worker']),
  createdAt: z.string().datetime(),
})

export interface TelegramOutboxProcessResult {
  claimed: number
  sent: number
  retried: number
  failed: number
  skipped: number
}

export function calculateTelegramRetryAt(
  now: Date,
  attemptCount: number,
  retryAfterSeconds: number | null,
) {
  const fallback =
    RETRY_DELAYS_SECONDS[Math.min(Math.max(attemptCount - 1, 0), RETRY_DELAYS_SECONDS.length - 1)]!
  const delaySeconds = Math.max(fallback, retryAfterSeconds ?? 0)
  return new Date(now.getTime() + delaySeconds * 1000)
}

function hydrateIssuePayload(payload: Record<string, unknown>): TelegramIssueMessage {
  const parsed = issuePayloadSchema.parse(payload)

  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
  }
}

async function claimTelegramDeliveries(limit: number, onlyIds?: number[]) {
  const db = useDb()
  const now = new Date()
  const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS)

  return await db.transaction(async tx => {
    const availability = or(
      and(
        eq(telegramDeliveryOutbox.status, 'pending'),
        lte(telegramDeliveryOutbox.nextAttemptAt, now),
      ),
      and(
        eq(telegramDeliveryOutbox.status, 'processing'),
        or(
          isNull(telegramDeliveryOutbox.lockedAt),
          lte(telegramDeliveryOutbox.lockedAt, staleBefore),
        ),
      ),
    )
    const where =
      onlyIds && onlyIds.length
        ? and(availability, inArray(telegramDeliveryOutbox.id, onlyIds))
        : availability
    const candidates = await tx
      .select()
      .from(telegramDeliveryOutbox)
      .where(where)
      .orderBy(asc(telegramDeliveryOutbox.nextAttemptAt), asc(telegramDeliveryOutbox.id))
      .limit(Math.min(Math.max(limit, 1), 50))
      .for('update', { skipLocked: true })

    const claimed = []

    for (const candidate of candidates) {
      const [updated] = await tx
        .update(telegramDeliveryOutbox)
        .set({
          status: 'processing',
          attemptCount: sql`${telegramDeliveryOutbox.attemptCount} + 1`,
          lockedAt: now,
          lastAttemptAt: now,
          updatedAt: now,
        })
        .where(eq(telegramDeliveryOutbox.id, candidate.id))
        .returning()

      if (updated) claimed.push(updated)
    }

    return claimed
  })
}

export async function processTelegramOutbox(options?: { limit?: number; ids?: number[] }) {
  const deliveries = await claimTelegramDeliveries(options?.limit ?? 10, options?.ids)
  const result: TelegramOutboxProcessResult = {
    claimed: deliveries.length,
    sent: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
  }

  for (const delivery of deliveries) {
    const now = new Date()

    try {
      const telegram = await sendTelegramIssueNotification(hydrateIssuePayload(delivery.payload))

      if (telegram.status === 'sent') {
        await useDb()
          .update(telegramDeliveryOutbox)
          .set({
            status: 'sent',
            lockedAt: null,
            telegramMessageId: String(telegram.messageId),
            lastErrorCode: null,
            lastErrorMessage: null,
            sentAt: now,
            updatedAt: now,
          })
          .where(eq(telegramDeliveryOutbox.id, delivery.id))
        result.sent += 1
        continue
      }

      if (telegram.status === 'skipped') {
        await useDb()
          .update(telegramDeliveryOutbox)
          .set({
            status: 'skipped',
            lockedAt: null,
            lastErrorCode: telegram.reason,
            lastErrorMessage:
              telegram.reason === 'disabled'
                ? 'Telegram 알림이 비활성화되어 있습니다.'
                : 'Telegram 설정이 없습니다.',
            updatedAt: now,
          })
          .where(eq(telegramDeliveryOutbox.id, delivery.id))
        result.skipped += 1
        continue
      }

      const shouldRetry = telegram.retryable && delivery.attemptCount < MAX_ATTEMPTS

      await useDb()
        .update(telegramDeliveryOutbox)
        .set({
          status: shouldRetry ? 'pending' : 'failed',
          nextAttemptAt: shouldRetry
            ? calculateTelegramRetryAt(now, delivery.attemptCount, telegram.retryAfterSeconds)
            : delivery.nextAttemptAt,
          lockedAt: null,
          lastErrorCode: telegram.code,
          lastErrorMessage: telegram.message.slice(0, 500),
          updatedAt: now,
        })
        .where(eq(telegramDeliveryOutbox.id, delivery.id))

      if (shouldRetry) result.retried += 1
      else result.failed += 1
    } catch {
      const shouldRetry = delivery.attemptCount < MAX_ATTEMPTS

      await useDb()
        .update(telegramDeliveryOutbox)
        .set({
          status: shouldRetry ? 'pending' : 'failed',
          nextAttemptAt: shouldRetry
            ? calculateTelegramRetryAt(now, delivery.attemptCount, null)
            : delivery.nextAttemptAt,
          lockedAt: null,
          lastErrorCode: 'invalid_payload',
          lastErrorMessage: 'Telegram 전송 payload를 처리하지 못했습니다.',
          updatedAt: now,
        })
        .where(eq(telegramDeliveryOutbox.id, delivery.id))

      if (shouldRetry) result.retried += 1
      else result.failed += 1
    }
  }

  return result
}

export async function retryTelegramDelivery(id: number) {
  const now = new Date()
  const [delivery] = await useDb()
    .update(telegramDeliveryOutbox)
    .set({
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: now,
      lockedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(telegramDeliveryOutbox.id, id),
        inArray(telegramDeliveryOutbox.status, ['failed', 'skipped']),
      ),
    )
    .returning({ id: telegramDeliveryOutbox.id })

  if (!delivery) return null

  const result = await processTelegramOutbox({ ids: [delivery.id], limit: 1 })
  return { id: delivery.id, result }
}
