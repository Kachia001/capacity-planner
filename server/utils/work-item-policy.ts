import type { AppRole } from './auth'

export type WorkItemStatus = 'not_started' | 'in_progress' | 'completed'

export function isSupervisor(role: AppRole) {
  return role === 'admin' || role === 'manager'
}

export function canWorkerTransition(from: WorkItemStatus, to: WorkItemStatus) {
  return (
    (from === 'not_started' && to === 'in_progress') ||
    (from === 'in_progress' && to === 'completed')
  )
}

export function canCompleteWorkItem(role: AppRole, actorUserId: string, startedBy: string | null) {
  return isSupervisor(role) || startedBy === actorUserId
}
