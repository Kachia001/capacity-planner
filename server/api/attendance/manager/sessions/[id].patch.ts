import { eq } from 'drizzle-orm'
import { appUsers, attendanceSessions } from '#server/db/schema'
import { attendanceCorrectionSchema, parseAttendanceInput } from '#server/utils/attendance-input'
import {
  assertValidAttendanceTimes,
  ensureNoAttendanceOverlap,
  isUniqueViolation,
} from '#server/utils/attendance'
import { writeApplicationLog } from '#server/utils/application-log'

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
        .select({
          id: attendanceSessions.id,
          userId: attendanceSessions.userId,
          startedAt: attendanceSessions.startedAt,
          endedAt: attendanceSessions.endedAt,
          targetRole: appUsers.role,
        })
        .from(attendanceSessions)
        .innerJoin(appUsers, eq(appUsers.authUserId, attendanceSessions.userId))
        .where(eq(attendanceSessions.id, id))
        .limit(1)
      if (!current)
        throw createError({ statusCode: 404, message: '출퇴근 세션을 찾을 수 없습니다.' })
      requireAttendanceTargetAccess(profile.role, current.targetRole)

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
      await writeApplicationLog(tx, {
        level: 'warn',
        category: 'attendance',
        event: 'attendance.session_corrected',
        message: '관리자가 출퇴근 기록을 수정했습니다.',
        actorUserId: profile.authUserId,
        metadata: { attendanceSessionId: id, targetUserId: current.userId },
        createdAt: now,
      })
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
