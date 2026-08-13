import { eq } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'
import { attendanceCorrectionSchema, parseAttendanceInput } from '#server/utils/attendance-input'
import {
  assertValidAttendanceTimes,
  ensureNoAttendanceOverlap,
  isUniqueViolation,
} from '#server/utils/attendance'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: '올바른 세션 ID가 필요합니다.' })
  }
  const changes = parseAttendanceInput(attendanceCorrectionSchema, await readBody(event))
  const db = useDb()
  const now = new Date()

  try {
    return await db.transaction(async tx => {
      const [current] = await tx
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.id, id))
        .limit(1)
      if (!current) throw createError({ statusCode: 404, message: '출퇴근 세션을 찾을 수 없습니다.' })

      const startedAt = changes.startedAt ?? current.startedAt
      const endedAt = changes.endedAt !== undefined ? changes.endedAt : current.endedAt
      assertValidAttendanceTimes(startedAt, endedAt)
      await ensureNoAttendanceOverlap(tx, {
        userId: current.userId,
        startedAt,
        endedAt,
        excludeId: id,
      })

      const [updated] = await tx
        .update(attendanceSessions)
        .set({ startedAt, endedAt, updatedAt: now, updatedByUserId: profile.authUserId })
        .where(eq(attendanceSessions.id, id))
        .returning()
      return updated!
    })
  } catch (error) {
    if (isUniqueViolation(error, 'attendance_sessions_user_open_uk')) {
      throw createError({
        statusCode: 409,
        message: '이미 다른 활성 출퇴근 세션이 있습니다.',
        data: { code: 'ATTENDANCE_ALREADY_CLOCKED_IN' },
      })
    }
    throw error
  }
})
