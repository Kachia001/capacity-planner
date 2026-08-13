import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'
import { attendanceRangeSchema, parseAttendanceInput } from '#server/utils/attendance-input'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
  const db = useDb()
  const query = getQuery(event)

  const active = await db.query.attendanceSessions.findFirst({
    where: and(
      eq(attendanceSessions.userId, profile.authUserId),
      isNull(attendanceSessions.endedAt),
    ),
  })

  let attendedInRange = false
  if (query.start !== undefined || query.end !== undefined) {
    const range = parseAttendanceInput(attendanceRangeSchema, query)
    const [started] = await db
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.userId, profile.authUserId),
          gte(attendanceSessions.startedAt, range.start),
          lt(attendanceSessions.startedAt, range.end),
        ),
      )
      .orderBy(desc(attendanceSessions.startedAt))
      .limit(1)
    attendedInRange = Boolean(started)
  }

  return { isWorking: Boolean(active), attendedInRange, activeSession: active ?? null }
})
