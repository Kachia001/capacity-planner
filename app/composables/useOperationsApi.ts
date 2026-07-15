import type {
  BayOption,
  CompletedWorkItemRestoreTarget,
  OperationsDashboardResponse,
  WorkItemSearchFilters,
  WorkItemSearchResponse,
} from '@/types/operations'

function authorizationHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

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

export async function fetchBayOptions(accessToken: string) {
  return await $fetch<BayOption[]>('/api/bays', {
    headers: authorizationHeaders(accessToken),
  })
}

export async function fetchOperationsDashboard(accessToken: string) {
  return await $fetch<OperationsDashboardResponse>('/api/dashboard/bays', {
    headers: authorizationHeaders(accessToken),
  })
}

export async function fetchBayWorkItems(
  accessToken: string,
  bayId: string,
  filters: WorkItemSearchFilters,
  cursor?: string | null,
  workItemId?: number | null,
) {
  return await $fetch<WorkItemSearchResponse>(`/api/bays/${bayId}/work-items`, {
    headers: authorizationHeaders(accessToken),
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

export async function startWorkItem(accessToken: string, workItemId: number) {
  return await $fetch(`/api/work-items/${workItemId}/start`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
  })
}

export async function completeWorkItem(accessToken: string, workItemId: number) {
  return await $fetch(`/api/work-items/${workItemId}/complete`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
  })
}

export async function cancelWorkItemStart(accessToken: string, workItemId: number, reason: string) {
  return await $fetch(`/api/work-items/${workItemId}/cancel-start`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: { reason },
  })
}

export async function restoreCompletedWorkItem(
  accessToken: string,
  workItemId: number,
  targetStatus: CompletedWorkItemRestoreTarget,
  reason: string,
) {
  return await $fetch(`/api/work-items/${workItemId}/restore-completed`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: { targetStatus, reason },
  })
}

export async function voidWorkItem(accessToken: string, workItemId: number, reason: string) {
  return await $fetch(`/api/work-items/${workItemId}/void`, {
    method: 'POST',
    headers: authorizationHeaders(accessToken),
    body: { reason },
  })
}
