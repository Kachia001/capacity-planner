import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { appUsers, type AppUser } from '../db/schema'

export type AppRole = AppUser['role']

export type AuthorizedAppUser = {
  authUser: {
    id: string
    email: string
  }
  profile: AppUser
}

export async function requireSessionUser(event: H3Event) {
  const token = getSessionCookie(event)
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication is required.',
    })
  }

  const session = await readSessionToken(token)
  if (!session) {
    clearSessionCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'The session is invalid or expired.',
    })
  }

  const db = useDb()
  const [profile] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.authUserId, session.userId))
    .limit(1)

  if (profile && !profile.isActive) {
    clearSessionCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: '이용이 정지된 계정입니다.',
      data: { code: 'ACCOUNT_DISABLED' },
    })
  }

  if (!profile || profile.authVersion !== session.authVersion) {
    clearSessionCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'The session is no longer valid.',
    })
  }

  return profile
}

export async function requireAppUser(
  event: H3Event,
  allowedRoles?: AppRole[],
): Promise<AuthorizedAppUser> {
  const profile = await requireSessionUser(event)

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to access this resource.',
    })
  }

  return {
    authUser: {
      id: profile.authUserId,
      email: profile.email,
    },
    profile,
  }
}
