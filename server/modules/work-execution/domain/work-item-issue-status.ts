import type { WorkItemIssueStatus } from './work-item.types'

export function canTransitionWorkItemIssueStatus(
  from: WorkItemIssueStatus,
  to: WorkItemIssueStatus,
) {
  return (
    (from === 'unconfirmed' && to === 'in_review') ||
    (from === 'in_review' && (to === 'unconfirmed' || to === 'resolved'))
  )
}
