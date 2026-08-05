import { describe, expect, it } from 'vitest'
import type { WorkItemIssueStatus } from './work-item.types'
import { canTransitionWorkItemIssueStatus } from './work-item-issue-status'

const statuses: WorkItemIssueStatus[] = ['unconfirmed', 'in_review', 'resolved']

describe('canTransitionWorkItemIssueStatus', () => {
  it.each([
    ['unconfirmed', 'in_review'],
    ['in_review', 'unconfirmed'],
    ['in_review', 'resolved'],
  ] satisfies [WorkItemIssueStatus, WorkItemIssueStatus][])('allows %s -> %s', (from, to) => {
    expect(canTransitionWorkItemIssueStatus(from, to)).toBe(true)
  })

  it.each(
    statuses.flatMap(from =>
      statuses
        .filter(to => to !== from && !canTransitionWorkItemIssueStatus(from, to))
        .map(to => [from, to] as const),
    ),
  )('rejects %s -> %s', (from, to) => {
    expect(canTransitionWorkItemIssueStatus(from, to)).toBe(false)
  })
})
