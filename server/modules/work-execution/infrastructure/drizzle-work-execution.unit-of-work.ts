import type { Database } from '#server/infrastructure/database/database.types'
import type {
  WorkExecutionRepositories,
  WorkExecutionUnitOfWork,
} from '../repository/work-execution.unit-of-work'
import { DrizzleIssueNotificationOutboxRepository } from './drizzle-issue-notification-outbox.repository'
import { DrizzleApplicationLogRepository } from './drizzle-application-log.repository'
import { DrizzleWorkItemEventRepository } from './drizzle-work-item-event.repository'
import { DrizzleWorkItemIssueRepository } from './drizzle-work-item-issue.repository'
import { DrizzleWorkItemRepository } from './drizzle-work-item.repository'

export class DrizzleWorkExecutionUnitOfWork implements WorkExecutionUnitOfWork {
  constructor(private readonly db: Database) {}

  execute<T>(operation: (repositories: WorkExecutionRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async transaction => {
      const repositories: WorkExecutionRepositories = {
        applicationLogs: new DrizzleApplicationLogRepository(transaction),
        workItems: new DrizzleWorkItemRepository(transaction),
        issues: new DrizzleWorkItemIssueRepository(transaction),
        events: new DrizzleWorkItemEventRepository(transaction),
        issueNotifications: new DrizzleIssueNotificationOutboxRepository(transaction),
      }

      return operation(repositories)
    })
  }
}
