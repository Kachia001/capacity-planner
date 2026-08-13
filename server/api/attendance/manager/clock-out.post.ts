import { and, eq, isNull, lte } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'
import { managerAttendanceActionSchema, parseAttendanceInput } from '#server/utils/attendance-input'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const { userId } = parseAttendanceInput(managerAttendanceActionSchema, await readBody(event))
  const db = useDb()
  const now = new Date()
  const session = await db.transaction(async tx => {
    const [ended] = await tx
      .update(attendanceSessions)
      .set({ endedAt: now, updatedAt: now, updatedByUserId: profile.authUserId })
      .where(
        and(
          eq(attendanceSessions.userId, userId),
          isNull(attendanceSessions.endedAt),
          lte(attendanceSessions.startedAt, now),
        ),
      )
      .returning()
    if (ended) {
      await writeApplicationLog(tx, {
        level: 'info',
        category: 'attendance',
        event: 'attendance.manager_clock_out',
        message: '관리자가 사용자의 퇴근을 대신 처리했습니다.',
        actorUserId: profile.authUserId,
        metadata: { targetUserId: userId, attendanceSessionId: ended.id },
        createdAt: now,
      })
    }
    return ended
  })
  if (!session) {
    throw createError({
      statusCode: 409,
      message: '대상 사용자에게 퇴근 처리할 유효한 활성 세션이 없습니다.',
      data: { code: 'ATTENDANCE_NOT_CLOCKED_IN' },
    })
  }
  return session
})
