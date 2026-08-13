import { attendanceSessions } from '#server/db/schema'
import { ensureNoAttendanceOverlap, isUniqueViolation } from '#server/utils/attendance'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
  const db = useDb()
  const now = new Date()

  try {
    const session = await db.transaction(async tx => {
      await ensureNoAttendanceOverlap(tx, {
        userId: profile.authUserId,
        startedAt: now,
        endedAt: null,
      })
      const [created] = await tx
        .insert(attendanceSessions)
        .values({
          userId: profile.authUserId,
          startedAt: now,
          updatedAt: now,
          updatedByUserId: profile.authUserId,
        })
        .returning()
      await writeApplicationLog(tx, {
        level: 'info',
        category: 'attendance',
        event: 'attendance.clock_in',
        message: '사용자가 출근 처리했습니다.',
        actorUserId: profile.authUserId,
        metadata: { attendanceSessionId: created!.id },
        createdAt: now,
      })
      return created!
    })
    setResponseStatus(event, 201)
    return session
  } catch (error) {
    if (isUniqueViolation(error, 'attendance_sessions_user_open_uk')) {
      throw createError({
        statusCode: 409,
        message: '이미 출근 처리되어 있습니다.',
        data: { code: 'ATTENDANCE_ALREADY_CLOCKED_IN' },
      })
    }
    throw error
  }
})
