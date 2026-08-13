import { WorkItemNotFoundError } from '../domain/work-item.errors'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { WorkItemCommand } from './dto/work-item-command'
import type { Clock } from './ports/clock'
import type { OperationGate } from './ports/operation-gate'
import { toWorkItemStateResult } from './work-item-result.mapper'

export class CompleteWorkItemService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly operationGate: OperationGate,
    private readonly clock: Clock,
  ) {}

  async execute(command: WorkItemCommand) {
    const now = this.clock.now()
    await this.operationGate.ensureOpen(now, command.actor.userId)

    return this.unitOfWork.execute(async repositories => {
      const workItem = await repositories.workItems.findById(command.workItemId)

      if (!workItem) {
        throw new WorkItemNotFoundError(command.workItemId)
      }

      workItem.complete(command.actor, now)
      await repositories.workItems.save(workItem)
      await repositories.events.append(workItem.pullStatusEvents())
      await repositories.applicationLogs.write({
        level: 'info',
        category: 'work-item',
        event: 'work-item.completed',
        message: '사용자가 작업을 완료했습니다.',
        actorUserId: command.actor.userId,
        metadata: { workItemId: command.workItemId },
        createdAt: now,
      })

      return toWorkItemStateResult(workItem)
    })
  }
}
