import { WorkItemNotFoundError } from '../domain/work-item.errors'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { ReportWorkItemIssueCommand } from './dto/work-item-command'
import type { ReportWorkItemIssueResult } from './dto/work-item-result'
import {
  IssueRateLimitExceededError,
  NotificationOutboxFailedError,
} from './errors/work-execution.errors'
import type { Clock } from './ports/clock'
import type { OperationGate } from './ports/operation-gate'

const ISSUE_RATE_LIMIT_WINDOW_MS = 60_000
const ISSUE_RATE_LIMIT_COUNT = 5

export class ReportWorkItemIssueService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly operationGate: OperationGate,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReportWorkItemIssueCommand): Promise<ReportWorkItemIssueResult> {
    const now = this.clock.now()
    await this.operationGate.ensureOpen(now, command.actor.userId)

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

      const snapshot = workItem.snapshot()
      const issueDraft = workItem.reportIssue(command.actor, command.category, command.note, now)
      const issue = await repositories.issues.create(issueDraft)

      if (!issue) {
        throw new NotificationOutboxFailedError()
      }

      const mode = await repositories.issueNotifications.getMode()
      const delivery = await repositories.issueNotifications.enqueue({
        workItemId: snapshot.id,
        issueId: issue.id,
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
          category: command.category,
          note: command.note,
          reporterName: command.actor.displayName,
          reporterRole: command.actor.role,
          createdAt: now.toISOString(),
        },
      })

      if (!delivery) {
        throw new NotificationOutboxFailedError()
      }

      await repositories.applicationLogs.write({
        level: 'warn',
        category: 'work-item',
        event: 'work-item.issue_reported',
        message: '사용자가 작업 이슈를 등록했습니다.',
        actorUserId: command.actor.userId,
        metadata: {
          workItemId: command.workItemId,
          issueId: issue.id,
          category: command.category,
        },
        createdAt: now,
      })

      const notification: ReportWorkItemIssueResult['notification'] =
        delivery.status === 'pending'
          ? { status: 'queued', deliveryId: delivery.id }
          : {
              status: 'skipped',
              reason: delivery.skippedReason ?? 'not_configured',
              deliveryId: delivery.id,
            }

      return {
        issue: {
          ...issue,
          createdByName: command.actor.displayName,
        },
        notification,
      }
    })
  }
}
