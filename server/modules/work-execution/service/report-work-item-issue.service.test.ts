import { describe, expect, it } from 'vitest'
import { WorkItem } from '../domain/work-item'
import type {
  Actor,
  NewWorkItemIssue,
  WorkItemIssueRecord,
  WorkItemProps,
} from '../domain/work-item.types'
import type {
  EnqueueIssueNotificationInput,
  IssueNotificationOutboxRepository,
} from '../repository/issue-notification-outbox.repository'
import type { WorkItemEventRepository } from '../repository/work-item-event.repository'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { WorkItemIssueRepository } from '../repository/work-item-issue.repository'
import type { WorkItemRepository } from '../repository/work-item.repository'
import type { Clock } from './ports/clock'
import { ReportWorkItemIssueService } from './report-work-item-issue.service'

const actor: Actor = {
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'worker',
  displayName: '작업자 A',
}
const fixedNow = new Date('2026-07-31T01:00:00.000Z')

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
    updatedAt: new Date('2026-07-30T00:00:00.000Z'),
  }

  return WorkItem.reconstitute(props)
}

class InMemoryWorkItemRepository implements WorkItemRepository {
  constructor(private readonly workItem: WorkItem) {}

  async findById(id: number) {
    return id === this.workItem.id ? this.workItem : null
  }

  async save() {}
}

class InMemoryIssueRepository implements WorkItemIssueRepository {
  readonly issues: WorkItemIssueRecord[] = []

  async create(issue: NewWorkItemIssue) {
    const created: WorkItemIssueRecord = {
      ...issue,
      id: this.issues.length + 1,
      statusUpdatedBy: null,
      statusUpdatedAt: null,
    }
    this.issues.push(created)
    return created
  }
}

class InMemoryNotificationRepository implements IssueNotificationOutboxRepository {
  readonly requests: EnqueueIssueNotificationInput[] = []

  async countRequestedSince() {
    return 0
  }

  async getMode() {
    return 'enabled' as const
  }

  async enqueue(input: EnqueueIssueNotificationInput) {
    this.requests.push(input)
    return {
      id: this.requests.length,
      status: 'pending' as const,
      skippedReason: null,
    }
  }
}

class NoopEventRepository implements WorkItemEventRepository {
  async append() {}
}

class FixedClock implements Clock {
  now() {
    return fixedNow
  }
}

describe('ReportWorkItemIssueService', () => {
  it('creates multiple unconfirmed issues for one work item and queues each notification', async () => {
    const issues = new InMemoryIssueRepository()
    const notifications = new InMemoryNotificationRepository()
    const repositories = {
      workItems: new InMemoryWorkItemRepository(createWorkItem()),
      issues,
      events: new NoopEventRepository(),
      issueNotifications: notifications,
    }
    const unitOfWork: WorkExecutionUnitOfWork = {
      execute: async operation => await operation(repositories),
    }
    const service = new ReportWorkItemIssueService(unitOfWork, new FixedClock())

    const first = await service.execute({
      workItemId: 1,
      actor,
      category: 'material_shortage',
      note: '케이블 재고가 부족합니다.',
    })
    const second = await service.execute({
      workItemId: 1,
      actor,
      category: 'quality_issue',
      note: '연결부 품질 확인이 필요합니다.',
    })

    expect(issues.issues).toHaveLength(2)
    expect(issues.issues.map(issue => issue.status)).toEqual(['unconfirmed', 'unconfirmed'])
    expect(first.issue.category).toBe('material_shortage')
    expect(second.issue.category).toBe('quality_issue')
    expect(notifications.requests.map(request => request.issueId)).toEqual([1, 2])
  })
})
