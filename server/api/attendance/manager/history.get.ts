import { and, asc, eq, gt, isNull, lt, ne, or } from 'drizzle-orm'
import { appUsers, attendanceSessions } from '#server/db/schema'
import { attendanceRangeSchema, parseAttendanceInput } from '#server/utils/attendance-input'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const range = parseAttendanceInput(attendanceRangeSchema, getQuery(event))
  const db = useDb()
  return db
    .select({
      id: attendanceSessions.id,
      userId: attendanceSessions.userId,
      startedAt: attendanceSessions.startedAt,
      endedAt: attendanceSessions.endedAt,
      createdAt: attendanceSessions.createdAt,
      updatedAt: attendanceSessions.updatedAt,
      updatedByUserId: attendanceSessions.updatedByUserId,
      email: appUsers.email,
      displayName: appUsers.displayName,
      role: appUsers.role,
    })
    .from(attendanceSessions)
    .innerJoin(appUsers, eq(appUsers.authUserId, attendanceSessions.userId))
    .where(
      and(
        lt(attendanceSessions.startedAt, range.end),
        or(isNull(attendanceSessions.endedAt), gt(attendanceSessions.endedAt, range.start)),
        range.userId ? eq(attendanceSessions.userId, range.userId) : undefined,
        profile.role === 'manager' ? ne(appUsers.role, 'admin') : undefined,
      ),
    )
    .orderBy(asc(attendanceSessions.startedAt))
})
