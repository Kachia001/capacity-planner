import type {
  WorkItemIssueCategory,
  WorkItemIssueStatus,
  WorkItemStatus,
} from '../../domain/work-item.types'

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
  issue: {
    id: number
    workItemId: number
    category: WorkItemIssueCategory
    status: WorkItemIssueStatus
    note: string
    createdBy: string | null
    createdByName: string | null
    createdAt: Date
    updatedAt: Date
    closedAt: Date | null
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
