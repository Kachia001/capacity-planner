import { getOperationStatus } from '#server/utils/operation-policy'
import { OperationClosedError } from '../service/errors/work-execution.errors'
import type { OperationGate } from '../service/ports/operation-gate'

export class CurrentOperationGate implements OperationGate {
  async ensureOpen(now: Date) {
    const status = await getOperationStatus(now)

    if (!status.isOpen) {
      throw new OperationClosedError(
        status.isWithinRegularHours
          ? '현재 운영이 Close 상태입니다. 관리자가 Open한 후 작업할 수 있습니다.'
          : '정규 운영시간(08:20~17:20) 외에는 관리자가 연장 시간을 정하고 Open해야 합니다.',
      )
    }
  }
}
