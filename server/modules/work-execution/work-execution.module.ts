import type { Database } from '#server/infrastructure/database/database.types'
import { processTelegramOutbox } from '#server/utils/telegram-outbox'
import { CancelWorkItemStartController } from './controller/cancel-work-item-start.controller'
import { CompleteWorkItemController } from './controller/complete-work-item.controller'
import { ReportWorkItemIssueController } from './controller/report-work-item-issue.controller'
import { RestoreCompletedWorkItemController } from './controller/restore-completed-work-item.controller'
import { StartWorkItemController } from './controller/start-work-item.controller'
import { VoidWorkItemController } from './controller/void-work-item.controller'
import { CurrentOperationGate } from './infrastructure/current-operation.gate'
import { DrizzleWorkExecutionUnitOfWork } from './infrastructure/drizzle-work-execution.unit-of-work'
import { SystemClock } from './infrastructure/system-clock'
import { CancelWorkItemStartService } from './service/cancel-work-item-start.service'
import { CompleteWorkItemService } from './service/complete-work-item.service'
import { ReportWorkItemIssueService } from './service/report-work-item-issue.service'
import { RestoreCompletedWorkItemService } from './service/restore-completed-work-item.service'
import { StartWorkItemService } from './service/start-work-item.service'
import { VoidWorkItemService } from './service/void-work-item.service'

export function createWorkExecutionModule(db: Database) {
  const clock = new SystemClock()
  const operationGate = new CurrentOperationGate()
  const unitOfWork = new DrizzleWorkExecutionUnitOfWork(db)

  const startService = new StartWorkItemService(unitOfWork, operationGate, clock)
  const completeService = new CompleteWorkItemService(unitOfWork, operationGate, clock)
  const cancelStartService = new CancelWorkItemStartService(unitOfWork, clock)
  const restoreCompletedService = new RestoreCompletedWorkItemService(unitOfWork, clock)
  const voidService = new VoidWorkItemService(unitOfWork, clock)
  const reportIssueService = new ReportWorkItemIssueService(unitOfWork, clock)

  return {
    startWorkItemController: new StartWorkItemController(startService),
    completeWorkItemController: new CompleteWorkItemController(completeService),
    cancelWorkItemStartController: new CancelWorkItemStartController(cancelStartService),
    restoreCompletedWorkItemController: new RestoreCompletedWorkItemController(
      restoreCompletedService,
    ),
    voidWorkItemController: new VoidWorkItemController(voidService),
    reportWorkItemIssueController: new ReportWorkItemIssueController(
      reportIssueService,
      deliveryId => processTelegramOutbox({ ids: [deliveryId], limit: 1 }),
    ),
  }
}
