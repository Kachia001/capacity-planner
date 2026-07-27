import { CodedError } from '../../../../shared/errors/coded.error'

export class ConcurrentWorkItemUpdateError extends CodedError {
  readonly code = 'WORK_ITEM_CONCURRENT_UPDATE'

  constructor(readonly workItemId: number) {
    super('다른 사용자가 먼저 작업 상태를 변경했습니다.')
  }
}

export class OperationClosedError extends CodedError {
  readonly code = 'OPERATION_CLOSED'

  constructor(message: string) {
    super(message)
  }
}

export class IssueRateLimitExceededError extends CodedError {
  readonly code = 'ISSUE_RATE_LIMIT_EXCEEDED'

  constructor() {
    super('이슈는 1분에 최대 5건까지 등록할 수 있습니다. 잠시 후 다시 시도해 주세요.')
  }
}

export class NotificationOutboxFailedError extends CodedError {
  readonly code = 'NOTIFICATION_OUTBOX_FAILED'

  constructor() {
    super('Telegram 전송 대기 항목을 생성하지 못했습니다.')
  }
}
