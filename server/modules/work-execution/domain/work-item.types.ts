export type ActorRole = 'admin' | 'manager' | 'worker'
export type WorkItemStatus = 'not_started' | 'in_progress' | 'completed'
export type WorkItemRestoreTarget = Exclude<WorkItemStatus, 'completed'>
export type WorkItemEventAction = 'start' | 'complete' | 'cancel_start' | 'void' | 'restore'
export type WorkItemIssueCategory = 'material_shortage' | 'work_delay' | 'quality_issue' | 'other'
export type WorkItemIssueStatus = 'unconfirmed' | 'in_review' | 'resolved'

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

export type NewWorkItemIssue = {
  workItemId: number
  category: WorkItemIssueCategory
  status: Extract<WorkItemIssueStatus, 'unconfirmed'>
  note: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type WorkItemIssueRecord = Omit<NewWorkItemIssue, 'status' | 'createdBy'> & {
  id: number
  status: WorkItemIssueStatus
  createdBy: string | null
  statusUpdatedBy: string | null
  statusUpdatedAt: Date | null
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
  updatedAt: Date
}
