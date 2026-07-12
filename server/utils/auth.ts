import type { H3Event } from 'h3'
import type { User } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { appUsers, type AppUser } from '../db/schema'

export type AppRole = AppUser['role']

export type AuthorizedAppUser = {
  authUser: User
  profile: AppUser
}

export async function requireSupabaseUser(event: H3Event) {
  const authorization = getHeader(event, 'authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing Supabase access token.',
    })
  }

  const { data, error } = await useSupabaseAdmin().auth.getUser(token)

  if (error || !data.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired Supabase access token.',
    })
  }

  return data.user
}

export async function requireAppUser(event: H3Event, allowedRoles?: AppRole[]): Promise<AuthorizedAppUser> {
  const authUser = await requireSupabaseUser(event)
  const db = useDb()
  const [profile] = await db.select().from(appUsers).where(eq(appUsers.authUserId, authUser.id)).limit(1)

  if (!profile) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This Supabase account is not registered in app_users.',
    })
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to access this resource.',
    })
  }

  return {
    authUser,
    profile,
  }
}
