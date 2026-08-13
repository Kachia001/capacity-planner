import { and, eq, isNull, lte } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
  const db = useDb()
  const now = new Date()
  const [session] = await db
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

  if (!session) {
    throw createError({
      statusCode: 409,
      message: '퇴근 처리할 유효한 활성 세션이 없습니다.',
      data: { code: 'ATTENDANCE_NOT_CLOCKED_IN' },
    })
  }
  return session
})
