import { WorkItemNotFoundError } from '../domain/work-item.errors'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { RestoreCompletedWorkItemCommand } from './dto/work-item-command'
import type { Clock } from './ports/clock'
import { toWorkItemStateResult } from './work-item-result.mapper'

export class RestoreCompletedWorkItemService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: RestoreCompletedWorkItemCommand) {
    const now = this.clock.now()

    return this.unitOfWork.execute(async repositories => {
      const workItem = await repositories.workItems.findById(command.workItemId)

      if (!workItem) {
        throw new WorkItemNotFoundError(command.workItemId)
      }

      workItem.restoreCompleted(command.actor, command.targetStatus, command.reason, now)
      await repositories.workItems.save(workItem)
      await repositories.events.append(workItem.pullStatusEvents())
      await repositories.applicationLogs.write({
        level: 'warn',
        category: 'work-item',
        event: 'work-item.restored',
        message: '관리자가 완료된 작업을 이전 상태로 복원했습니다.',
        actorUserId: command.actor.userId,
        metadata: {
          workItemId: command.workItemId,
          targetStatus: command.targetStatus,
        },
        createdAt: now,
      })

      return toWorkItemStateResult(workItem)
    })
  }
}
