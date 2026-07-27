import type { IssueSeverity, IssueStatus, WorkItemStatus } from '../../domain/work-item.types'

export type WorkItemStateResult = {
  id: number
  status: WorkItemStatus
  startedBy: string | null
  startedAt: Date | null
  completedBy: string | null
  completedAt: Date | null
  voidedAt: Date | null
  version: number
}

export type ReportWorkItemIssueResult = {
  item: {
    id: number
    hasIssue: true
    issueStatus: Extract<IssueStatus, 'open'>
    issueSeverity: IssueSeverity
    issueNote: string
    issueCreatedAt: Date
    version: number
  }
  notification:
    | {
        status: 'queued'
        deliveryId: number
      }
    | {
        status: 'skipped'
        reason: 'not_configured' | 'disabled'
        deliveryId: number
      }
}
