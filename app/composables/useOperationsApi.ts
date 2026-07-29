import type {
  BayOption,
  CompletedWorkItemRestoreTarget,
  IssueSeverity,
  OperationStatus,
  OperationsDashboardResponse,
  WorkItemSearchFilters,
  WorkItemSearchResponse,
} from '@/types/operations'
import type {
  CancelWorkItemStartRequest,
  CancelWorkItemStartResponse,
} from '#shared/api/work-items/cancel-work-item-start.contract'
import type { CompleteWorkItemResponse } from '#shared/api/work-items/complete-work-item.contract'
import type {
  ReportWorkItemIssueRequest,
  ReportWorkItemIssueResponse,
} from '#shared/api/work-items/report-work-item-issue.contract'
import type {
  RestoreCompletedWorkItemRequest,
  RestoreCompletedWorkItemResponse,
} from '#shared/api/work-items/restore-completed-work-item.contract'
import type { StartWorkItemResponse } from '#shared/api/work-items/start-work-item.contract'
import type {
  VoidWorkItemRequest,
  VoidWorkItemResponse,
} from '#shared/api/work-items/void-work-item.contract'

export function getRequestErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error) {
    const data = 'data' in error ? error.data : null

    if (typeof data === 'object' && data && 'statusMessage' in data) {
      const statusMessage = data.statusMessage
      if (typeof statusMessage === 'string' && statusMessage.trim()) {
        return statusMessage
      }
    }

    if ('statusMessage' in error && typeof error.statusMessage === 'string') {
      return error.statusMessage
    }
  }

  return error instanceof Error && error.message ? error.message : fallback
}

export async function fetchBayOptions() {
  return await $fetch<BayOption[]>('/api/bays')
}

export async function fetchOperationsDashboard() {
  return await $fetch<OperationsDashboardResponse>('/api/dashboard/bays')
}

export async function fetchOperationStatus() {
  return await $fetch<OperationStatus>('/api/operations/status')
}

export async function openOperation(extensionMinutes?: number) {
  return await $fetch<OperationStatus>('/api/operations/open', {
    method: 'POST',
    body: extensionMinutes === undefined ? {} : { extensionMinutes },
  })
}

export async function closeOperation() {
  return await $fetch<OperationStatus>('/api/operations/close', {
    method: 'POST',
  })
}

export async function fetchBayWorkItems(
  bayId: string,
  filters: WorkItemSearchFilters,
  cursor?: string | null,
  workItemId?: number | null,
) {
  return await $fetch<WorkItemSearchResponse>(`/api/bays/${bayId}/work-items`, {
    query: {
      q: filters.q.trim() || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      highAltitude: filters.highAltitude ?? undefined,
      hasIssue: filters.hasIssue ?? undefined,
      workItemId: workItemId ?? undefined,
      cursor: cursor ?? undefined,
      limit: 30,
    },
  })
}

export async function startWorkItem(workItemId: number) {
  return await $fetch<StartWorkItemResponse>(`/api/work-items/${workItemId}/start`, {
    method: 'POST',
  })
}

export async function completeWorkItem(workItemId: number) {
  return await $fetch<CompleteWorkItemResponse>(`/api/work-items/${workItemId}/complete`, {
    method: 'POST',
  })
}

export async function cancelWorkItemStart(workItemId: number, reason: string) {
  const body: CancelWorkItemStartRequest = { reason }

  return await $fetch<CancelWorkItemStartResponse>(`/api/work-items/${workItemId}/cancel-start`, {
    method: 'POST',
    body,
  })
}

export async function restoreCompletedWorkItem(
  workItemId: number,
  targetStatus: CompletedWorkItemRestoreTarget,
  reason: string,
) {
  const body: RestoreCompletedWorkItemRequest = { targetStatus, reason }

  return await $fetch<RestoreCompletedWorkItemResponse>(
    `/api/work-items/${workItemId}/restore-completed`,
    {
      method: 'POST',
      body,
    },
  )
}

export async function voidWorkItem(workItemId: number, reason: string) {
  const body: VoidWorkItemRequest = { reason }

  return await $fetch<VoidWorkItemResponse>(`/api/work-items/${workItemId}/void`, {
    method: 'POST',
    body,
  })
}

export async function reportWorkItemIssue(
  workItemId: number,
  severity: IssueSeverity,
  note: string,
) {
  const body: ReportWorkItemIssueRequest = { severity, note }

  return await $fetch<ReportWorkItemIssueResponse>(`/api/work-items/${workItemId}/issue`, {
    method: 'POST',
    body,
  })
}
