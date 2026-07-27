import type { Database } from '#server/infrastructure/database/database.types'
import type {
  WorkExecutionRepositories,
  WorkExecutionUnitOfWork,
} from '../repository/work-execution.unit-of-work'
import { DrizzleIssueNotificationOutboxRepository } from './drizzle-issue-notification-outbox.repository'
import { DrizzleWorkItemEventRepository } from './drizzle-work-item-event.repository'
import { DrizzleWorkItemRepository } from './drizzle-work-item.repository'

export class DrizzleWorkExecutionUnitOfWork implements WorkExecutionUnitOfWork {
  constructor(private readonly db: Database) {}

  execute<T>(operation: (repositories: WorkExecutionRepositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async transaction => {
      const repositories: WorkExecutionRepositories = {
        workItems: new DrizzleWorkItemRepository(transaction),
        events: new DrizzleWorkItemEventRepository(transaction),
        issueNotifications: new DrizzleIssueNotificationOutboxRepository(transaction),
      }

      return operation(repositories)
    })
  }
}
