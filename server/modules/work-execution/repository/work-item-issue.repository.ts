import type { NewWorkItemIssue, WorkItemIssueRecord } from '../domain/work-item.types'

export interface WorkItemIssueRepository {
  create(issue: NewWorkItemIssue): Promise<WorkItemIssueRecord | null>
}
