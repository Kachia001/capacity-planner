import type { ActorRole, IssueSeverity } from '../domain/work-item.types'

export type IssueNotificationMode = 'enabled' | 'disabled' | 'not_configured'

export type IssueNotificationPayload = {
  bayCode: string
  workItemId: number
  workNo: number | null
  workName: string | null
  workDetail: string | null
  partNo: string | null
  isHighAltitude: boolean
  severity: IssueSeverity
  note: string
  reporterName: string
  reporterRole: ActorRole
  createdAt: string
}

export type EnqueueIssueNotificationInput = {
  workItemId: number
  issueVersion: number
  requestedBy: string
  payload: IssueNotificationPayload
  mode: IssueNotificationMode
}

export type IssueNotificationDelivery = {
  id: number
  status: 'pending' | 'skipped'
  skippedReason: 'disabled' | 'not_configured' | null
}

export interface IssueNotificationOutboxRepository {
  countRequestedSince(requestedBy: string, since: Date): Promise<number>
  getMode(): Promise<IssueNotificationMode>
  enqueue(input: EnqueueIssueNotificationInput): Promise<IssueNotificationDelivery | null>
}
