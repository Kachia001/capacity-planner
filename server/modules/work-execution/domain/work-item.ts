import {
  InvalidWorkItemTransitionError,
  WorkItemAdminRequiredError,
  WorkItemCompletionForbiddenError,
  WorkItemNotFoundError,
  WorkItemSupervisorRequiredError,
} from './work-item.errors'
import type {
  Actor,
  NewWorkItemIssue,
  WorkItemIssueCategory,
  WorkItemProps,
  WorkItemRestoreTarget,
  WorkItemStatusEvent,
} from './work-item.types'

export class WorkItem {
  private readonly initialVersion: number
  private readonly pendingStatusEvents: WorkItemStatusEvent[] = []

  private constructor(private readonly props: WorkItemProps) {
    this.initialVersion = props.version
  }

  static reconstitute(props: WorkItemProps) {
    return new WorkItem({ ...props })
  }

  get id() {
    return this.props.id
  }

  get originalVersion() {
    return this.initialVersion
  }

  snapshot(): Readonly<WorkItemProps> {
    return { ...this.props }
  }

  pullStatusEvents(): WorkItemStatusEvent[] {
    return this.pendingStatusEvents.splice(0)
  }

  start(actor: Actor, now: Date, workDate: string) {
    this.ensureAvailable()

    if (this.props.status !== 'not_started') {
      throw new InvalidWorkItemTransitionError('이미 다른 작업자가 시작했거나 처리된 작업입니다.')
    }

    const fromStatus = this.props.status
    this.props.status = 'in_progress'
    this.props.startedBy = actor.userId
    this.props.startedAt = now
    this.props.completedBy = null
    this.props.completedAt = null
    this.props.worker = actor.displayName
    this.props.workDate = workDate
    this.props.isCompleted = false
    this.touch(now)
    this.recordStatusEvent(fromStatus, 'in_progress', 'start', actor, null, now)
  }

  complete(actor: Actor, now: Date) {
    this.ensureAvailable()

    if (this.props.status !== 'in_progress') {
      throw new InvalidWorkItemTransitionError('작업 중 상태의 작업만 완료할 수 있습니다.')
    }

    if (actor.role === 'worker' && this.props.startedBy !== actor.userId) {
      throw new WorkItemCompletionForbiddenError()
    }

    const fromStatus = this.props.status
    this.props.status = 'completed'
    this.props.completedBy = actor.userId
    this.props.completedAt = now
    this.props.isCompleted = true
    this.touch(now)
    this.recordStatusEvent(fromStatus, 'completed', 'complete', actor, null, now)
  }

  cancelStart(actor: Actor, reason: string, now: Date) {
    this.ensureAvailable()
    this.ensureSupervisor(actor)

    if (this.props.status !== 'in_progress') {
      throw new InvalidWorkItemTransitionError('작업 중 상태의 작업만 시작 취소할 수 있습니다.')
    }

    const fromStatus = this.props.status
    this.props.status = 'not_started'
    this.props.startedBy = null
    this.props.startedAt = null
    this.props.completedBy = null
    this.props.completedAt = null
    this.props.worker = null
    this.props.workDate = null
    this.props.isCompleted = false
    this.touch(now)
    this.recordStatusEvent(fromStatus, 'not_started', 'cancel_start', actor, reason, now)
  }

  restoreCompleted(actor: Actor, targetStatus: WorkItemRestoreTarget, reason: string, now: Date) {
    this.ensureAvailable()
    this.ensureSupervisor(actor, '완료 작업을 복구할 권한이 없습니다.')

    if (this.props.status !== 'completed') {
      throw new InvalidWorkItemTransitionError(
        '완료 상태의 작업만 작업 중 또는 대기로 복구할 수 있습니다.',
      )
    }

    const fromStatus = this.props.status

    if (targetStatus === 'not_started') {
      this.props.startedBy = null
      this.props.startedAt = null
      this.props.worker = null
      this.props.workDate = null
    }

    this.props.status = targetStatus
    this.props.completedBy = null
    this.props.completedAt = null
    this.props.isCompleted = false
    this.touch(now)
    this.recordStatusEvent(fromStatus, targetStatus, 'restore', actor, reason, now)
  }

  void(actor: Actor, reason: string, now: Date) {
    this.ensureAvailable()

    if (actor.role !== 'admin') {
      throw new WorkItemAdminRequiredError()
    }

    const currentStatus = this.props.status
    this.props.voidedBy = actor.userId
    this.props.voidedAt = now
    this.props.voidReason = reason
    this.touch(now)
    this.recordStatusEvent(currentStatus, currentStatus, 'void', actor, reason, now)
  }

  reportIssue(
    actor: Actor,
    category: WorkItemIssueCategory,
    note: string,
    now: Date,
  ): NewWorkItemIssue {
    this.ensureAvailable()

    return {
      workItemId: this.props.id,
      category,
      status: 'unconfirmed',
      note,
      createdBy: actor.userId,
      createdAt: now,
      updatedAt: now,
    }
  }

  private ensureAvailable() {
    if (this.props.voidedAt) {
      throw new WorkItemNotFoundError(this.props.id)
    }
  }

  private ensureSupervisor(actor: Actor, message?: string) {
    if (actor.role !== 'admin' && actor.role !== 'manager') {
      throw new WorkItemSupervisorRequiredError(message)
    }
  }

  private touch(now: Date) {
    this.props.version += 1
    this.props.updatedAt = now
  }

  private recordStatusEvent(
    fromStatus: WorkItemStatusEvent['fromStatus'],
    toStatus: WorkItemStatusEvent['toStatus'],
    action: WorkItemStatusEvent['action'],
    actor: Actor,
    reason: string | null,
    occurredAt: Date,
  ) {
    this.pendingStatusEvents.push({
      workItemId: this.props.id,
      fromStatus,
      toStatus,
      action,
      actorUserId: actor.userId,
      actorRole: actor.role,
      reason,
      occurredAt,
    })
  }
}
