import { asc, ne } from 'drizzle-orm'
import { appUsers } from '../db/schema'

export default defineEventHandler(async (event) => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const db = useDb()

  const rows = profile.role === 'admin'
    ? await db.select().from(appUsers).orderBy(asc(appUsers.role), asc(appUsers.email))
    : await db.select().from(appUsers).where(ne(appUsers.role, 'admin')).orderBy(asc(appUsers.role), asc(appUsers.email))

  return rows.map(user => ({
    id: user.authUserId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  }))
})
