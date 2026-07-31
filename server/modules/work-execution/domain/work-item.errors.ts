import { CodedError } from '../../../shared/errors/coded.error'

export class WorkItemNotFoundError extends CodedError {
  readonly code = 'WORK_ITEM_NOT_FOUND'

  constructor(readonly workItemId: number) {
    super('작업을 찾을 수 없습니다.')
  }
}

export class InvalidWorkItemTransitionError extends CodedError {
  readonly code = 'WORK_ITEM_INVALID_TRANSITION'

  constructor(message: string) {
    super(message)
  }
}

export class WorkItemCompletionForbiddenError extends CodedError {
  readonly code = 'WORK_ITEM_COMPLETION_FORBIDDEN'

  constructor() {
    super('본인이 시작한 작업만 완료할 수 있습니다.')
  }
}

export class WorkItemSupervisorRequiredError extends CodedError {
  readonly code = 'WORK_ITEM_SUPERVISOR_REQUIRED'

  constructor(message = '관리자 권한이 필요한 작업입니다.') {
    super(message)
  }
}

export class WorkItemAdminRequiredError extends CodedError {
  readonly code = 'WORK_ITEM_ADMIN_REQUIRED'

  constructor() {
    super('작업을 무효화할 권한이 없습니다.')
  }
}
