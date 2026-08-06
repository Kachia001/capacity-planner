import type { AppRole } from '@/stores/auth'
import type {
  WorkItemIssueCategory as ApiWorkItemIssueCategory,
  WorkItemIssueStatus as ApiWorkItemIssueStatus,
  WorkItemRestoreTarget,
  WorkItemStatus as ApiWorkItemStatus,
} from '#shared/api/work-items/work-item.contract'

export type WorkItemStatus = ApiWorkItemStatus
export type CompletedWorkItemRestoreTarget = WorkItemRestoreTarget
export type WorkItemIssueCategory = ApiWorkItemIssueCategory
export type WorkItemIssueStatus = ApiWorkItemIssueStatus
export type WorkItemEventAction = 'start' | 'complete' | 'cancel_start' | 'restore' | 'void'
export type OperationMode = 'regular' | 'extension' | 'closed'

export interface OperationStatus {
  isOpen: boolean
  mode: OperationMode
  isWithinRegularHours: boolean
  regularOpensAt: string
  regularClosesAt: string
  closesAt: string | null
  nextRegularOpensAt: string | null
  serverNow: string
  timeZone: 'Asia/Seoul'
}

export interface OperationOpenRequest {
  extensionMinutes?: number
  extensionUntil?: string
}

export interface BayOption {
  id: string
  code: string
  description: string | null
  tableNumber: number | null
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
  openIssueCount: number
  issues: OperationWorkItemIssue[]
  isHighAltitude: boolean
  safetyNote: string | null
  version: number
  updatedAt: string
  startedByName: string | null
  startedByEmail: string | null
}

export interface OperationWorkItemIssue {
  id: number
  workItemId: number
  category: WorkItemIssueCategory
  status: WorkItemIssueStatus
  note: string
  resolutionNote: string | null
  createdBy: string | null
  createdByName: string | null
  createdByEmail: string | null
  statusUpdatedBy: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
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
  workItemId: number
  bayId: string
  bayCode: string
  workName: string | null
  workDetail: string | null
  note: string
  category: WorkItemIssueCategory
  status: WorkItemIssueStatus
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
