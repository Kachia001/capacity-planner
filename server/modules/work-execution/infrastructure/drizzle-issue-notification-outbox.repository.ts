import { and, eq, gte, sql } from 'drizzle-orm'
import { telegramDeliveryOutbox, telegramSettings } from '#server/db/schema'
import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'
import type {
  EnqueueIssueNotificationInput,
  IssueNotificationDelivery,
  IssueNotificationOutboxRepository,
} from '../repository/issue-notification-outbox.repository'

export class DrizzleIssueNotificationOutboxRepository implements IssueNotificationOutboxRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async countRequestedSince(requestedBy: string, since: Date) {
    const [recent] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(telegramDeliveryOutbox)
      .where(
        and(
          eq(telegramDeliveryOutbox.requestedBy, requestedBy),
          gte(telegramDeliveryOutbox.createdAt, since),
        ),
      )

    return recent?.count ?? 0
  }

  async getMode() {
    const [settings] = await this.db
      .select({ isEnabled: telegramSettings.isEnabled })
      .from(telegramSettings)
      .where(eq(telegramSettings.id, 1))
      .limit(1)

    if (!settings) {
      return 'not_configured' as const
    }

    return settings.isEnabled ? ('enabled' as const) : ('disabled' as const)
  }

  async enqueue(input: EnqueueIssueNotificationInput): Promise<IssueNotificationDelivery | null> {
    const status = input.mode === 'enabled' ? ('pending' as const) : ('skipped' as const)
    const skippedReason = input.mode === 'enabled' ? null : input.mode
    const [delivery] = await this.db
      .insert(telegramDeliveryOutbox)
      .values({
        workItemId: input.workItemId,
        issueVersion: input.issueVersion,
        requestedBy: input.requestedBy,
        payload: input.payload,
        status,
        lastErrorCode: skippedReason,
        lastErrorMessage:
          skippedReason === 'disabled'
            ? 'Telegram 알림이 비활성화되어 있습니다.'
            : skippedReason === 'not_configured'
              ? 'Telegram 설정이 없습니다.'
              : null,
        updatedAt: new Date(input.payload.createdAt),
      })
      .returning({
        id: telegramDeliveryOutbox.id,
        status: telegramDeliveryOutbox.status,
        lastErrorCode: telegramDeliveryOutbox.lastErrorCode,
      })

    if (!delivery || (delivery.status !== 'pending' && delivery.status !== 'skipped')) {
      return null
    }

    const normalizedSkippedReason: IssueNotificationDelivery['skippedReason'] =
      delivery.lastErrorCode === 'disabled' || delivery.lastErrorCode === 'not_configured'
        ? delivery.lastErrorCode
        : null

    return {
      id: delivery.id,
      status: delivery.status,
      skippedReason: normalizedSkippedReason,
    }
  }
}
