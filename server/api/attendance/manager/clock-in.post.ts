import { eq } from 'drizzle-orm'
import { attendanceSessions, appUsers } from '#server/db/schema'
import { managerAttendanceActionSchema, parseAttendanceInput } from '#server/utils/attendance-input'
import { ensureNoAttendanceOverlap, isUniqueViolation } from '#server/utils/attendance'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const { userId } = parseAttendanceInput(managerAttendanceActionSchema, await readBody(event))
  const db = useDb()
  const now = new Date()
  const target = await db.query.appUsers.findFirst({ where: eq(appUsers.authUserId, userId) })
  if (!target) throw createError({ statusCode: 404, message: '대상 사용자를 찾을 수 없습니다.' })

  try {
    const session = await db.transaction(async tx => {
      await ensureNoAttendanceOverlap(tx, { userId, startedAt: now, endedAt: null })
      const [created] = await tx
        .insert(attendanceSessions)
        .values({ userId, startedAt: now, updatedAt: now, updatedByUserId: profile.authUserId })
        .returning()
      return created!
    })
    setResponseStatus(event, 201)
    return session
  } catch (error) {
    if (isUniqueViolation(error, 'attendance_sessions_user_open_uk')) {
      throw createError({
        statusCode: 409,
        message: '대상 사용자는 이미 출근 처리되어 있습니다.',
        data: { code: 'ATTENDANCE_ALREADY_CLOCKED_IN' },
      })
    }
    throw error
  }
})
