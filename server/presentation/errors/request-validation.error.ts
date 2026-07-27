import type { $ZodIssue } from 'zod/v4/core'
import { CodedError } from '#server/shared/errors/coded.error'

export class RequestValidationError extends CodedError {
  readonly code = 'REQUEST_VALIDATION_FAILED'

  constructor(
    message: string,
    readonly issues?: $ZodIssue[],
  ) {
    super(message)
  }
}
