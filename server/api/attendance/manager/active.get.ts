import { and, eq, isNull, ne } from 'drizzle-orm'
import { appUsers, attendanceSessions } from '#server/db/schema'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const rows = await useDb()
    .select({ userId: attendanceSessions.userId })
    .from(attendanceSessions)
    .innerJoin(appUsers, eq(appUsers.authUserId, attendanceSessions.userId))
    .where(
      and(
        isNull(attendanceSessions.endedAt),
        profile.role === 'manager' ? ne(appUsers.role, 'admin') : undefined,
      ),
    )
  return { userIds: rows.map(row => row.userId) }
})
