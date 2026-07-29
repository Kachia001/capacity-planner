import { asc, ne } from 'drizzle-orm'
import { appUsers } from '../db/schema'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const db = useDb()

  const safeSelection = {
    authUserId: appUsers.authUserId,
    email: appUsers.email,
    displayName: appUsers.displayName,
    role: appUsers.role,
    isActive: appUsers.isActive,
    createdAt: appUsers.createdAt,
  }
  const rows =
    profile.role === 'admin'
      ? await db
          .select(safeSelection)
          .from(appUsers)
          .orderBy(asc(appUsers.role), asc(appUsers.email))
      : await db
          .select(safeSelection)
          .from(appUsers)
          .where(ne(appUsers.role, 'admin'))
          .orderBy(asc(appUsers.role), asc(appUsers.email))

  return rows.map(user => ({
    id: user.authUserId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }))
})
