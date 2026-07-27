import type { IssueNotificationOutboxRepository } from './issue-notification-outbox.repository'
import type { WorkItemEventRepository } from './work-item-event.repository'
import type { WorkItemRepository } from './work-item.repository'

export type WorkExecutionRepositories = {
  workItems: WorkItemRepository
  events: WorkItemEventRepository
  issueNotifications: IssueNotificationOutboxRepository
}

export interface WorkExecutionUnitOfWork {
  execute<T>(operation: (repositories: WorkExecutionRepositories) => Promise<T>): Promise<T>
}
