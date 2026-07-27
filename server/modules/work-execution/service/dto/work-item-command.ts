import type { Actor, IssueSeverity, WorkItemRestoreTarget } from '../../domain/work-item.types'

export type WorkItemCommand = {
  workItemId: number
  actor: Actor
}

export type ReasonedWorkItemCommand = WorkItemCommand & {
  reason: string
}

export type RestoreCompletedWorkItemCommand = ReasonedWorkItemCommand & {
  targetStatus: WorkItemRestoreTarget
}

export type ReportWorkItemIssueCommand = WorkItemCommand & {
  severity: IssueSeverity
  note: string
}
