import { describe, expect, it } from 'vitest'
import { WorkItem } from './work-item'
import {
  InvalidWorkItemTransitionError,
  WorkItemCompletionForbiddenError,
  WorkItemIssueAlreadyOpenError,
  WorkItemNotFoundError,
} from './work-item.errors'
import type { Actor, WorkItemProps } from './work-item.types'

const workerA: Actor = {
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'worker',
  displayName: '작업자 A',
}
const workerB: Actor = {
  userId: '00000000-0000-4000-8000-000000000002',
  role: 'worker',
  displayName: '작업자 B',
}
const manager: Actor = {
  userId: '00000000-0000-4000-8000-000000000003',
  role: 'manager',
  displayName: '관리자',
}
const admin: Actor = {
  userId: '00000000-0000-4000-8000-000000000004',
  role: 'admin',
  displayName: '최고 관리자',
}
const now = new Date('2026-07-27T01:00:00.000Z')

function createProps(overrides: Partial<WorkItemProps> = {}): WorkItemProps {
  return {
    id: 1,
    bayCode: 'BAY-01',
    workNo: 10,
    workName: '배선',
    workDetail: '케이블 연결',
    partNo: 'PART-01',
    isHighAltitude: false,
    status: 'not_started',
    startedBy: null,
    startedAt: null,
    completedBy: null,
    completedAt: null,
    worker: null,
    workDate: null,
    isCompleted: false,
    version: 0,
    voidedBy: null,
    voidedAt: null,
    voidReason: null,
    hasIssue: false,
    issueStatus: null,
    issueSeverity: null,
    issueNote: null,
    issueCreatedAt: null,
    issueCreatedBy: null,
    issueResolvedAt: null,
    issueResolvedBy: null,
    updatedAt: new Date('2026-07-26T00:00:00.000Z'),
    ...overrides,
  }
}

describe('WorkItem aggregate', () => {
  it('starts an available work item and records an audit event', () => {
    const workItem = WorkItem.reconstitute(createProps())

    workItem.start(workerA, now, '2026-07-27')

    expect(workItem.snapshot()).toMatchObject({
      status: 'in_progress',
      startedBy: workerA.userId,
      startedAt: now,
      worker: workerA.displayName,
      workDate: '2026-07-27',
      version: 1,
      updatedAt: now,
    })
    expect(workItem.pullStatusEvents()).toEqual([
      {
        workItemId: 1,
        fromStatus: 'not_started',
        toStatus: 'in_progress',
        action: 'start',
        actorUserId: workerA.userId,
        actorRole: 'worker',
        reason: null,
        occurredAt: now,
      },
    ])
  })

  it('rejects starting a work item that is already in progress', () => {
    const workItem = WorkItem.reconstitute(
      createProps({ status: 'in_progress', startedBy: workerA.userId }),
    )

    expect(() => workItem.start(workerB, now, '2026-07-27')).toThrow(InvalidWorkItemTransitionError)
  })

  it('allows only the owning worker or a supervisor to complete work', () => {
    const ownedByA = createProps({
      status: 'in_progress',
      startedBy: workerA.userId,
      startedAt: now,
    })

    expect(() => WorkItem.reconstitute(ownedByA).complete(workerB, now)).toThrow(
      WorkItemCompletionForbiddenError,
    )

    const supervised = WorkItem.reconstitute(ownedByA)
    supervised.complete(manager, now)
    expect(supervised.snapshot()).toMatchObject({
      status: 'completed',
      completedBy: manager.userId,
      isCompleted: true,
    })
  })

  it('cancels a start and clears legacy execution fields', () => {
    const workItem = WorkItem.reconstitute(
      createProps({
        status: 'in_progress',
        startedBy: workerA.userId,
        startedAt: now,
        worker: workerA.displayName,
        workDate: '2026-07-27',
      }),
    )

    workItem.cancelStart(manager, '잘못 시작한 작업', now)

    expect(workItem.snapshot()).toMatchObject({
      status: 'not_started',
      startedBy: null,
      startedAt: null,
      worker: null,
      workDate: null,
      isCompleted: false,
      version: 1,
    })
  })

  it('restores completed work to the requested active state', () => {
    const workItem = WorkItem.reconstitute(
      createProps({
        status: 'completed',
        startedBy: workerA.userId,
        startedAt: now,
        completedBy: workerA.userId,
        completedAt: now,
        isCompleted: true,
      }),
    )

    workItem.restoreCompleted(manager, 'not_started', '완료 처리 오류', now)

    expect(workItem.snapshot()).toMatchObject({
      status: 'not_started',
      startedBy: null,
      completedBy: null,
      completedAt: null,
      isCompleted: false,
    })
  })

  it('makes a voided work item unavailable for later commands', () => {
    const workItem = WorkItem.reconstitute(createProps())
    workItem.void(admin, '중복 생성 항목', now)

    expect(workItem.snapshot()).toMatchObject({
      voidedBy: admin.userId,
      voidedAt: now,
      voidReason: '중복 생성 항목',
    })
    expect(() => workItem.reportIssue(workerA, 'high', '후속 이슈', now)).toThrow(
      WorkItemNotFoundError,
    )
  })

  it('opens one issue at a time', () => {
    const workItem = WorkItem.reconstitute(createProps())
    workItem.reportIssue(workerA, 'critical', '전원 연결 이상', now)

    expect(workItem.snapshot()).toMatchObject({
      hasIssue: true,
      issueStatus: 'open',
      issueSeverity: 'critical',
      issueNote: '전원 연결 이상',
      issueCreatedBy: workerA.userId,
    })
    expect(() => workItem.reportIssue(workerA, 'low', '추가 이슈', now)).toThrow(
      WorkItemIssueAlreadyOpenError,
    )
  })
})
