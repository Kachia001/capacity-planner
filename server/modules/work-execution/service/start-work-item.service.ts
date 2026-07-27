import { WorkItemNotFoundError } from '../domain/work-item.errors'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { WorkItemCommand } from './dto/work-item-command'
import type { Clock } from './ports/clock'
import type { OperationGate } from './ports/operation-gate'
import { toSeoulDate } from './work-date'
import { toWorkItemStateResult } from './work-item-result.mapper'

export class StartWorkItemService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly operationGate: OperationGate,
    private readonly clock: Clock,
  ) {}

  async execute(command: WorkItemCommand) {
    const now = this.clock.now()
    await this.operationGate.ensureOpen(now)

    return this.unitOfWork.execute(async repositories => {
      const workItem = await repositories.workItems.findById(command.workItemId)

      if (!workItem) {
        throw new WorkItemNotFoundError(command.workItemId)
      }

      workItem.start(command.actor, now, toSeoulDate(now))
      await repositories.workItems.save(workItem)
      await repositories.events.append(workItem.pullStatusEvents())

      return toWorkItemStateResult(workItem)
    })
  }
}
