import { WorkItemNotFoundError } from '../domain/work-item.errors'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { ReportWorkItemIssueCommand } from './dto/work-item-command'
import type { ReportWorkItemIssueResult } from './dto/work-item-result'
import {
  IssueRateLimitExceededError,
  NotificationOutboxFailedError,
} from './errors/work-execution.errors'
import type { Clock } from './ports/clock'

const ISSUE_RATE_LIMIT_WINDOW_MS = 60_000
const ISSUE_RATE_LIMIT_COUNT = 5

export class ReportWorkItemIssueService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReportWorkItemIssueCommand): Promise<ReportWorkItemIssueResult> {
    const now = this.clock.now()

    return this.unitOfWork.execute(async repositories => {
      const recentCount = await repositories.issueNotifications.countRequestedSince(
        command.actor.userId,
        new Date(now.getTime() - ISSUE_RATE_LIMIT_WINDOW_MS),
      )

      if (recentCount >= ISSUE_RATE_LIMIT_COUNT) {
        throw new IssueRateLimitExceededError()
      }

      const workItem = await repositories.workItems.findById(command.workItemId)

      if (!workItem) {
        throw new WorkItemNotFoundError(command.workItemId)
      }

      workItem.reportIssue(command.actor, command.severity, command.note, now)
      await repositories.workItems.save(workItem)

      const snapshot = workItem.snapshot()
      const mode = await repositories.issueNotifications.getMode()
      const delivery = await repositories.issueNotifications.enqueue({
        workItemId: snapshot.id,
        issueVersion: snapshot.version,
        requestedBy: command.actor.userId,
        mode,
        payload: {
          bayCode: snapshot.bayCode,
          workItemId: snapshot.id,
          workNo: snapshot.workNo,
          workName: snapshot.workName,
          workDetail: snapshot.workDetail,
          partNo: snapshot.partNo,
          isHighAltitude: snapshot.isHighAltitude,
          severity: command.severity,
          note: command.note,
          reporterName: command.actor.displayName,
          reporterRole: command.actor.role,
          createdAt: now.toISOString(),
        },
      })

      if (!delivery) {
        throw new NotificationOutboxFailedError()
      }

      const notification: ReportWorkItemIssueResult['notification'] =
        delivery.status === 'pending'
          ? { status: 'queued', deliveryId: delivery.id }
          : {
              status: 'skipped',
              reason: delivery.skippedReason ?? 'not_configured',
              deliveryId: delivery.id,
            }

      if (
        !snapshot.hasIssue ||
        snapshot.issueStatus !== 'open' ||
        !snapshot.issueSeverity ||
        !snapshot.issueNote ||
        !snapshot.issueCreatedAt
      ) {
        throw new NotificationOutboxFailedError()
      }

      return {
        item: {
          id: snapshot.id,
          hasIssue: true,
          issueStatus: 'open',
          issueSeverity: snapshot.issueSeverity,
          issueNote: snapshot.issueNote,
          issueCreatedAt: snapshot.issueCreatedAt,
          version: snapshot.version,
        },
        notification,
      }
    })
  }
}
