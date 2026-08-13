import { and, eq, gt, isNull, lt, ne, or, type SQL } from 'drizzle-orm'
import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'
import { attendanceSessions } from '#server/db/schema'

export const BUSINESS_TIME_ZONE = 'Asia/Seoul'

export function attendanceError(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, message, data: { code } })
}

export async function findActiveAttendance(db: DatabaseExecutor, userId: string) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(and(eq(attendanceSessions.userId, userId), isNull(attendanceSessions.endedAt)))
    .limit(1)
  return session ?? null
}

export async function ensureNoAttendanceOverlap(
  db: DatabaseExecutor,
  input: { userId: string; startedAt: Date; endedAt: Date | null; excludeId?: number },
) {
  const conditions = [
    eq(attendanceSessions.userId, input.userId),
    input.endedAt ? lt(attendanceSessions.startedAt, input.endedAt) : undefined,
    or(isNull(attendanceSessions.endedAt), gt(attendanceSessions.endedAt, input.startedAt)),
    input.excludeId ? ne(attendanceSessions.id, input.excludeId) : undefined,
  ].filter((condition): condition is SQL => Boolean(condition))

  const [overlap] = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(and(...conditions))
    .limit(1)

  if (overlap) {
    attendanceError(409, 'ATTENDANCE_SESSION_OVERLAP', '기존 출퇴근 기록과 시간이 겹칩니다.')
  }
}

export function assertValidAttendanceTimes(startedAt: Date, endedAt: Date | null) {
  if (endedAt && endedAt.getTime() < startedAt.getTime()) {
    attendanceError(400, 'ATTENDANCE_INVALID_TIME_ORDER', '퇴근 시각은 출근 시각보다 빠를 수 없습니다.')
  }
}

export function isUniqueViolation(error: unknown, constraint: string) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; constraint_name?: string; constraint?: string }
  return (
    candidate.code === '23505' &&
    (candidate.constraint_name === constraint || candidate.constraint === constraint)
  )
}
