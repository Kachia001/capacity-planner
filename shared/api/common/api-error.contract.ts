import { z } from 'zod'

export const ApiErrorCodeSchema = z.enum([
  'REQUEST_VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'ACCOUNT_DISABLED',
  'PASSWORD_CHANGE_REQUIRED',
  'PASSWORD_RESET_REQUIRED_LOGIN',
  'FORBIDDEN',
  'WORK_ITEM_NOT_FOUND',
  'WORK_ITEM_INVALID_TRANSITION',
  'WORK_ITEM_COMPLETION_FORBIDDEN',
  'WORK_ITEM_SUPERVISOR_REQUIRED',
  'WORK_ITEM_ADMIN_REQUIRED',
  'WORK_ITEM_CONCURRENT_UPDATE',
  'OPERATION_CLOSED',
  'ISSUE_RATE_LIMIT_EXCEEDED',
  'NOTIFICATION_OUTBOX_FAILED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
])

export const ApiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  statusMessage: z.string().optional(),
  data: z
    .object({
      code: ApiErrorCodeSchema,
      details: z.unknown().optional(),
      requestId: z.string().optional(),
    })
    .optional(),
})

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>
