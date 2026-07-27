import { WorkItemNotFoundError } from '../domain/work-item.errors'
import type { WorkExecutionUnitOfWork } from '../repository/work-execution.unit-of-work'
import type { ReasonedWorkItemCommand } from './dto/work-item-command'
import type { Clock } from './ports/clock'
import { toWorkItemStateResult } from './work-item-result.mapper'

export class CancelWorkItemStartService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReasonedWorkItemCommand) {
    const now = this.clock.now()

    return this.unitOfWork.execute(async repositories => {
      const workItem = await repositories.workItems.findById(command.workItemId)

      if (!workItem) {
        throw new WorkItemNotFoundError(command.workItemId)
      }

      workItem.cancelStart(command.actor, command.reason, now)
      await repositories.workItems.save(workItem)
      await repositories.events.append(workItem.pullStatusEvents())

      return toWorkItemStateResult(workItem)
    })
  }
}
