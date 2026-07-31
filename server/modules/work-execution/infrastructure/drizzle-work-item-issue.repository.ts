import { workItemIssues } from '#server/db/schema'
import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'
import type { WorkItemIssueRepository } from '../repository/work-item-issue.repository'

export class DrizzleWorkItemIssueRepository implements WorkItemIssueRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(issue: Parameters<WorkItemIssueRepository['create']>[0]) {
    const [created] = await this.db.insert(workItemIssues).values(issue).returning()

    return created ?? null
  }
}
