export type ActorRole = 'admin' | 'manager' | 'worker'
export type WorkItemStatus = 'not_started' | 'in_progress' | 'completed'
export type WorkItemRestoreTarget = Exclude<WorkItemStatus, 'completed'>
export type WorkItemEventAction = 'start' | 'complete' | 'cancel_start' | 'void' | 'restore'
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IssueStatus = 'open' | 'resolved'

export type Actor = {
  userId: string
  role: ActorRole
  displayName: string
}

export type WorkItemStatusEvent = {
  workItemId: number
  fromStatus: WorkItemStatus
  toStatus: WorkItemStatus
  action: WorkItemEventAction
  actorUserId: string
  actorRole: ActorRole
  reason: string | null
  occurredAt: Date
}

export type WorkItemProps = {
  id: number
  bayCode: string
  workNo: number | null
  workName: string | null
  workDetail: string | null
  partNo: string | null
  isHighAltitude: boolean
  status: WorkItemStatus
  startedBy: string | null
  startedAt: Date | null
  completedBy: string | null
  completedAt: Date | null
  worker: string | null
  workDate: string | null
  isCompleted: boolean
  version: number
  voidedBy: string | null
  voidedAt: Date | null
  voidReason: string | null
  hasIssue: boolean
  issueStatus: IssueStatus | null
  issueSeverity: IssueSeverity | null
  issueNote: string | null
  issueCreatedAt: Date | null
  issueCreatedBy: string | null
  issueResolvedAt: Date | null
  issueResolvedBy: string | null
  updatedAt: Date
}
