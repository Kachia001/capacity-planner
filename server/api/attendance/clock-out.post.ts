import { and, eq, isNull, lte } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
  const db = useDb()
  const now = new Date()
  const session = await db.transaction(async tx => {
    const [ended] = await tx
      .update(attendanceSessions)
      .set({ endedAt: now, updatedAt: now, updatedByUserId: profile.authUserId })
      .where(
        and(
          eq(attendanceSessions.userId, profile.authUserId),
          isNull(attendanceSessions.endedAt),
          lte(attendanceSessions.startedAt, now),
        ),
      )
      .returning()
    if (ended) {
      await writeApplicationLog(tx, {
        level: 'info',
        category: 'attendance',
        event: 'attendance.clock_out',
        message: '사용자가 퇴근 처리했습니다.',
        actorUserId: profile.authUserId,
        metadata: { attendanceSessionId: ended.id },
        createdAt: now,
      })
    }
    return ended
  })

  if (!session) {
    throw createError({
      statusCode: 409,
      message: '퇴근 처리할 유효한 활성 세션이 없습니다.',
      data: { code: 'ATTENDANCE_NOT_CLOCKED_IN' },
    })
  }
  return session
})
