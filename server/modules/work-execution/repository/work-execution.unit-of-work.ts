import type { IssueNotificationOutboxRepository } from './issue-notification-outbox.repository'
import type { WorkItemEventRepository } from './work-item-event.repository'
import type { WorkItemIssueRepository } from './work-item-issue.repository'
import type { WorkItemRepository } from './work-item.repository'

export type WorkExecutionRepositories = {
  workItems: WorkItemRepository
  issues: WorkItemIssueRepository
  events: WorkItemEventRepository
  issueNotifications: IssueNotificationOutboxRepository
}

export interface WorkExecutionUnitOfWork {
  execute<T>(operation: (repositories: WorkExecutionRepositories) => Promise<T>): Promise<T>
}
