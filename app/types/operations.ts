import type { AppRole } from '@/stores/auth'

export type WorkItemStatus = 'not_started' | 'in_progress' | 'completed'
export type CompletedWorkItemRestoreTarget = Exclude<WorkItemStatus, 'completed'>
export type IssueStatus = 'open' | 'resolved'
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'
export type WorkItemEventAction = 'start' | 'complete' | 'cancel_start' | 'restore' | 'void'

export interface BayOption {
  id: string
  code: string
  description: string | null
}

export interface OperationWorkItem {
  id: number
  bayId: string
  sortOrder: number
  sourceRow: number | null
  workNo: number | null
  workName: string | null
  workDetail: string | null
  vendor: string | null
  partNo: string | null
  itemName: string | null
  bolt: string | null
  status: WorkItemStatus
  startedBy: string | null
  startedAt: string | null
  completedBy: string | null
  completedAt: string | null
  worker: string | null
  hasIssue: boolean
  issueStatus: IssueStatus | null
  issueSeverity: IssueSeverity | null
  issueNote: string | null
  isHighAltitude: boolean
  safetyNote: string | null
  version: number
  updatedAt: string
  startedByName: string | null
  startedByEmail: string | null
}

export interface WorkItemSearchFilters {
  q: string
  status: WorkItemStatus | 'all'
  highAltitude: boolean | null
  hasIssue: boolean | null
}

export interface WorkItemSearchResponse {
  bay: BayOption
  items: OperationWorkItem[]
  total: number
  nextCursor: string | null
}

export interface DashboardBaySummary extends BayOption {
  total: number
  notStarted: number
  inProgress: number
  completed: number
  openIssues: number
  highAltitude: number
  highAltitudeInProgress: number
  activeWorkers: number
  lastActivityAt: string | null
  completionRate: number
}

export interface OperationsDashboardSummary {
  totalBays: number
  totalItems: number
  notStarted: number
  inProgress: number
  completed: number
  openIssues: number
  issueBays: number
  openBays: number
  completeBays: number
  highAltitudeInProgress: number
  startedToday: number
  completedToday: number
}

export interface DashboardIssue {
  id: number
  bayId: string
  bayCode: string
  workName: string | null
  workDetail: string | null
  issueNote: string | null
  severity: IssueSeverity | null
  createdAt: string | null
  workerName: string | null
  workerEmail: string | null
  isHighAltitude: boolean
}

export interface DashboardEvent {
  id: number
  workItemId: number
  bayId: string
  bayCode: string
  workName: string | null
  workDetail: string | null
  action: WorkItemEventAction
  fromStatus: WorkItemStatus
  toStatus: WorkItemStatus
  reason: string | null
  actorRole: AppRole
  actorName: string | null
  actorEmail: string | null
  createdAt: string
}

export interface OperationsDashboardResponse {
  summary: OperationsDashboardSummary
  bays: DashboardBaySummary[]
  issues: DashboardIssue[]
  recentEvents: DashboardEvent[]
  generatedAt: string
}
