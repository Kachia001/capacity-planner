import type {
  BayOption,
  CompletedWorkItemRestoreTarget,
  OperationOpenRequest,
  OperationStatus,
  OperationsDashboardResponse,
  WorkItemIssueCategory,
  WorkItemIssueStatus,
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
  UpdateWorkItemIssueContentRequest,
  UpdateWorkItemIssueContentResponse,
} from '#shared/api/work-items/update-work-item-issue-content.contract'
import type {
  UpdateWorkItemIssueStatusRequest,
  UpdateWorkItemIssueStatusResponse,
} from '#shared/api/work-items/update-work-item-issue-status.contract'
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

    if (typeof data === 'object' && data && 'message' in data) {
      const message = data.message
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }

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

export async function openOperation(request?: OperationOpenRequest) {
  return await $fetch<OperationStatus>('/api/operations/open', {
    method: 'POST',
    body: request ?? {},
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
  category: WorkItemIssueCategory,
  note: string,
) {
  const body: ReportWorkItemIssueRequest = { category, note }

  return await $fetch<ReportWorkItemIssueResponse>(`/api/work-items/${workItemId}/issue`, {
    method: 'POST',
    body,
  })
}

export async function updateWorkItemIssueStatus(
  workItemId: number,
  issueId: number,
  status: WorkItemIssueStatus,
  resolutionNote?: string | null,
) {
  const body: UpdateWorkItemIssueStatusRequest = { status, resolutionNote }

  return await $fetch<UpdateWorkItemIssueStatusResponse>(
    `/api/work-items/${workItemId}/issues/${issueId}/status`,
    {
      method: 'PATCH',
      body,
    },
  )
}

export async function updateWorkItemIssueContent(
  workItemId: number,
  issueId: number,
  note: string,
) {
  const body: UpdateWorkItemIssueContentRequest = { note }

  return await $fetch<UpdateWorkItemIssueContentResponse>(
    `/api/work-items/${workItemId}/issues/${issueId}`,
    {
      method: 'PATCH',
      body,
    },
  )
}
