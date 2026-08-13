import { describe, expect, it } from 'vitest'
import { WorkItem } from '../domain/work-item'
import type { Actor, WorkItemProps, WorkItemStatusEvent } from '../domain/work-item.types'
import type {
  EnqueueIssueNotificationInput,
  IssueNotificationOutboxRepository,
} from '../repository/issue-notification-outbox.repository'
import type {
  WorkExecutionRepositories,
  WorkExecutionUnitOfWork,
} from '../repository/work-execution.unit-of-work'
import type { WorkItemEventRepository } from '../repository/work-item-event.repository'
import type { WorkItemIssueRepository } from '../repository/work-item-issue.repository'
import type { WorkItemRepository } from '../repository/work-item.repository'
import type { Clock } from './ports/clock'
import type { OperationGate } from './ports/operation-gate'
import { StartWorkItemService } from './start-work-item.service'

const actor: Actor = {
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'worker',
  displayName: '작업자 A',
}
const fixedNow = new Date('2026-07-27T01:00:00.000Z')

function createWorkItem() {
  const props: WorkItemProps = {
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
    updatedAt: new Date('2026-07-26T00:00:00.000Z'),
  }

  return WorkItem.reconstitute(props)
}

class InMemoryWorkItemRepository implements WorkItemRepository {
  saved = false

  constructor(private readonly workItem: WorkItem) {}

  async findById(id: number) {
    return id === this.workItem.id ? this.workItem : null
  }

  async save() {
    this.saved = true
  }
}

class InMemoryEventRepository implements WorkItemEventRepository {
  readonly events: WorkItemStatusEvent[] = []

  async append(events: WorkItemStatusEvent[]) {
    this.events.push(...events)
  }
}

class NoopWorkItemIssueRepository implements WorkItemIssueRepository {
  async create() {
    return null
  }
}

class NoopIssueNotificationRepository implements IssueNotificationOutboxRepository {
  async countRequestedSince() {
    return 0
  }

  async getMode() {
    return 'not_configured' as const
  }

  async enqueue(_input: EnqueueIssueNotificationInput) {
    return null
  }
}

class InMemoryUnitOfWork implements WorkExecutionUnitOfWork {
  executed = false

  constructor(readonly repositories: WorkExecutionRepositories) {}

  async execute<T>(operation: (repositories: WorkExecutionRepositories) => Promise<T>): Promise<T> {
    this.executed = true
    return operation(this.repositories)
  }
}

class FixedClock implements Clock {
  now() {
    return fixedNow
  }
}

class OpenOperationGate implements OperationGate {
  checkedAt: Date | null = null
  checkedUserId: string | null = null

  async ensureOpen(now: Date, userId: string) {
    this.checkedAt = now
    this.checkedUserId = userId
  }
}

describe('StartWorkItemService', () => {
  it('coordinates operation policy, aggregate persistence, and audit persistence', async () => {
    const workItems = new InMemoryWorkItemRepository(createWorkItem())
    const events = new InMemoryEventRepository()
    const unitOfWork = new InMemoryUnitOfWork({
      workItems,
      issues: new NoopWorkItemIssueRepository(),
      events,
      issueNotifications: new NoopIssueNotificationRepository(),
    })
    const operationGate = new OpenOperationGate()
    const service = new StartWorkItemService(unitOfWork, operationGate, new FixedClock())

    const result = await service.execute({ workItemId: 1, actor })

    expect(operationGate.checkedAt).toEqual(fixedNow)
    expect(operationGate.checkedUserId).toBe(actor.userId)
    expect(unitOfWork.executed).toBe(true)
    expect(workItems.saved).toBe(true)
    expect(events.events).toHaveLength(1)
    expect(result).toMatchObject({
      id: 1,
      status: 'in_progress',
      startedBy: actor.userId,
      startedAt: fixedNow,
      version: 1,
    })
  })
})
