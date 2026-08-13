import { z } from 'zod'

export function parseAttendanceInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0]?.message ?? '출퇴근 요청 입력값을 확인해 주세요.',
      data: { code: 'REQUEST_VALIDATION_FAILED', details: result.error.issues },
    })
  }
  return result.data
}

const utcInstant = z
  .string()
  .datetime({ offset: true })
  .refine(value => value.endsWith('Z'), 'UTC ISO 8601 시각(Z)을 입력해 주세요.')
  .transform(value => new Date(value))

export const attendanceRangeSchema = z
  .object({ start: utcInstant, end: utcInstant, userId: z.string().uuid().optional() })
  .refine(value => value.end > value.start, {
    message: '조회 종료 시각은 시작 시각보다 늦어야 합니다.',
    path: ['end'],
  })

export const managerAttendanceActionSchema = z.object({ userId: z.string().uuid() })

export const attendanceCorrectionSchema = z
  .object({ startedAt: utcInstant.optional(), endedAt: utcInstant.nullable().optional() })
  .refine(value => value.startedAt !== undefined || value.endedAt !== undefined, {
    message: '수정할 출근 또는 퇴근 시각을 입력해 주세요.',
  })
