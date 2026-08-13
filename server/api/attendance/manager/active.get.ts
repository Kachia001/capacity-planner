import { isNull } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const rows = await useDb()
    .select({ userId: attendanceSessions.userId })
    .from(attendanceSessions)
    .where(isNull(attendanceSessions.endedAt))
  return { userIds: rows.map(row => row.userId) }
})

