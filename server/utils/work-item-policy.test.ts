import { describe, expect, it } from 'vitest'
import { canCompleteWorkItem, canWorkerTransition, isSupervisor } from './work-item-policy'

describe('work item state policy', () => {
  it('allows workers to move forward one state at a time', () => {
    expect(canWorkerTransition('not_started', 'in_progress')).toBe(true)
    expect(canWorkerTransition('in_progress', 'completed')).toBe(true)
  })

  it('rejects rollback, skipped, and repeated worker transitions', () => {
    expect(canWorkerTransition('in_progress', 'not_started')).toBe(false)
    expect(canWorkerTransition('completed', 'in_progress')).toBe(false)
    expect(canWorkerTransition('not_started', 'completed')).toBe(false)
    expect(canWorkerTransition('not_started', 'not_started')).toBe(false)
  })

  it('allows a worker to complete only the work item they started', () => {
    expect(canCompleteWorkItem('worker', 'worker-a', 'worker-a')).toBe(true)
    expect(canCompleteWorkItem('worker', 'worker-a', 'worker-b')).toBe(false)
    expect(canCompleteWorkItem('worker', 'worker-a', null)).toBe(false)
  })

  it('allows supervisors to correct or complete any active work item', () => {
    expect(isSupervisor('admin')).toBe(true)
    expect(isSupervisor('manager')).toBe(true)
    expect(isSupervisor('worker')).toBe(false)
    expect(canCompleteWorkItem('admin', 'admin-a', 'worker-a')).toBe(true)
    expect(canCompleteWorkItem('manager', 'manager-a', null)).toBe(true)
  })
})
