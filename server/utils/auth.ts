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
      message: 'Authentication is required.',
    })
  }

  const session = await readSessionToken(token)
  if (!session) {
    clearSessionCookie(event)
    throw createError({
      statusCode: 401,
      message: 'The session is invalid or expired.',
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
      message: '이용이 정지된 계정입니다.',
      data: { code: 'ACCOUNT_DISABLED' },
    })
  }

  if (!profile || profile.authVersion !== session.authVersion) {
    clearSessionCookie(event)
    if (profile?.mustChangePassword) {
      throw createError({
        statusCode: 401,
        message: '비밀번호가 초기화되었습니다. 임시 비밀번호로 다시 로그인해 주세요.',
        data: { code: 'PASSWORD_RESET_REQUIRED_LOGIN' },
      })
    }
    throw createError({
      statusCode: 401,
      message: 'The session is no longer valid.',
    })
  }

  event.context.applicationActorUserId = profile.authUserId

  return profile
}

export async function requireAppUser(
  event: H3Event,
  allowedRoles?: AppRole[],
): Promise<AuthorizedAppUser> {
  const profile = await requireSessionUser(event)

  if (profile.mustChangePassword) {
    throw createError({
      statusCode: 403,
      message: '임시 비밀번호를 변경해야 서비스를 이용할 수 있습니다.',
      data: { code: 'PASSWORD_CHANGE_REQUIRED' },
    })
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to access this resource.',
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
