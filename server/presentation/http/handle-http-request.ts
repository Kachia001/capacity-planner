import type { ZodType } from 'zod'
import { toHttpError } from '#server/presentation/errors/http-error.mapper'
import { RequestValidationError } from '#server/presentation/errors/request-validation.error'

export async function handleHttpRequest<T>(handler: () => Promise<T>): Promise<T> {
  try {
    return await handler()
  } catch (error) {
    throw toHttpError(error)
  }
}

export function parseRequest<T>(schema: ZodType<T>, input: unknown, message: string): T {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw new RequestValidationError(message, result.error.issues)
  }

  return result.data
}
