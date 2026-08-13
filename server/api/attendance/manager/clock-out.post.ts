import { and, eq, isNull, lte } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'
import { managerAttendanceActionSchema, parseAttendanceInput } from '#server/utils/attendance-input'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const { userId } = parseAttendanceInput(managerAttendanceActionSchema, await readBody(event))
  const db = useDb()
  const now = new Date()
  const [session] = await db
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
  if (!session) {
    throw createError({
      statusCode: 409,
      message: '대상 사용자에게 퇴근 처리할 유효한 활성 세션이 없습니다.',
      data: { code: 'ATTENDANCE_NOT_CLOCKED_IN' },
    })
  }
  return session
})
