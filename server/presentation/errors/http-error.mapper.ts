import { createError, isError, type H3Error } from 'h3'
import { ZodError } from 'zod'
import type { ApiErrorCode } from '#shared/api/common/api-error.contract'
import { CodedError } from '#server/shared/errors/coded.error'
import { RequestValidationError } from './request-validation.error'

const statusByErrorCode: Partial<Record<ApiErrorCode, number>> = {
  REQUEST_VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  ACCOUNT_DISABLED: 401,
  PASSWORD_CHANGE_REQUIRED: 403,
  PASSWORD_RESET_REQUIRED_LOGIN: 401,
  FORBIDDEN: 403,
  WORK_ITEM_NOT_FOUND: 404,
  WORK_ITEM_INVALID_TRANSITION: 409,
  WORK_ITEM_COMPLETION_FORBIDDEN: 403,
  WORK_ITEM_SUPERVISOR_REQUIRED: 403,
  WORK_ITEM_ADMIN_REQUIRED: 403,
  WORK_ITEM_CONCURRENT_UPDATE: 409,
  OPERATION_CLOSED: 423,
  ISSUE_RATE_LIMIT_EXCEEDED: 429,
  NOTIFICATION_OUTBOX_FAILED: 500,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_SERVER_ERROR: 500,
}

export function toHttpError(error: unknown): H3Error {
  if (isError(error)) {
    return error
  }

  if (error instanceof RequestValidationError) {
    return createError({
      statusCode: 400,
      message: error.message,
      data: {
        code: error.code satisfies ApiErrorCode,
        details: error.issues,
      },
    })
  }

  if (error instanceof ZodError) {
    return createError({
      statusCode: 400,
      message: error.issues[0]?.message ?? '요청 입력값을 확인해 주세요.',
      data: {
        code: 'REQUEST_VALIDATION_FAILED' satisfies ApiErrorCode,
        details: error.issues,
      },
    })
  }

  if (error instanceof CodedError) {
    const code = error.code as ApiErrorCode

    return createError({
      statusCode: statusByErrorCode[code] ?? 500,
      message: error.message,
      data: { code },
    })
  }

  console.error('[http] Unhandled server error', error)

  return createError({
    statusCode: 500,
    message: '요청 처리 중 오류가 발생했습니다.',
    data: {
      code: 'INTERNAL_SERVER_ERROR' satisfies ApiErrorCode,
    },
  })
}
