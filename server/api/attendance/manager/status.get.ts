import { and, asc, eq, gte, inArray, isNull, lt } from 'drizzle-orm'
import { appUsers, attendanceSessions } from '#server/db/schema'
import { attendanceRangeSchema, parseAttendanceInput } from '#server/utils/attendance-input'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const range = parseAttendanceInput(attendanceRangeSchema, getQuery(event))
  const db = useDb()
  const started = await db
    .select({
      sessionId: attendanceSessions.id,
      userId: attendanceSessions.userId,
      startedAt: attendanceSessions.startedAt,
      endedAt: attendanceSessions.endedAt,
      email: appUsers.email,
      displayName: appUsers.displayName,
      role: appUsers.role,
    })
    .from(attendanceSessions)
    .innerJoin(appUsers, eq(appUsers.authUserId, attendanceSessions.userId))
    .where(
      and(
        gte(attendanceSessions.startedAt, range.start),
        lt(attendanceSessions.startedAt, range.end),
      ),
    )
    .orderBy(asc(attendanceSessions.startedAt))

  const userIds = [...new Set(started.map(row => row.userId))]
  const activeIds = new Set<string>()
  if (userIds.length) {
    const active = await db
      .select({ userId: attendanceSessions.userId })
      .from(attendanceSessions)
      .where(and(inArray(attendanceSessions.userId, userIds), isNull(attendanceSessions.endedAt)))
    active.forEach(row => activeIds.add(row.userId))
  }

  const attendees = new Map<
    string,
    {
      userId: string
      email: string
      displayName: string | null
      role: typeof appUsers.$inferSelect.role
      isWorking: boolean
      sessions: Array<{ id: number; startedAt: Date; endedAt: Date | null }>
    }
  >()
  for (const row of started) {
    const attendee = attendees.get(row.userId) ?? {
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      isWorking: activeIds.has(row.userId),
      sessions: [],
    }
    attendee.sessions.push({ id: row.sessionId, startedAt: row.startedAt, endedAt: row.endedAt })
    attendees.set(row.userId, attendee)
  }
  return [...attendees.values()]
})
