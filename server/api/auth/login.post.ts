import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { appUsers } from '../../db/schema'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

const loginSchema = z.object({
  loginId: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(256),
})

export default defineEventHandler(async event => {
  const body = loginSchema.parse(await readBody(event))
  const email = normalizeLoginEmail(body.loginId)
  const db = useDb()
  const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1)
  const now = new Date()

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '아이디 또는 비밀번호가 올바르지 않습니다.',
    })
  }

  if (!user.isActive) {
    throw createError({
      statusCode: 401,
      statusMessage: '이용이 정지된 계정입니다.',
      data: { code: 'ACCOUNT_DISABLED' },
    })
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    throw createError({
      statusCode: 429,
      statusMessage: '로그인 시도가 잠겼습니다. 잠시 후 다시 시도해주세요.',
    })
  }

  const passwordMatches = await verifyPassword(user.passwordHash, body.password)

  if (!passwordMatches) {
    const failedLoginCount = user.failedLoginCount + 1
    const shouldLock = failedLoginCount >= MAX_FAILED_ATTEMPTS

    await db
      .update(appUsers)
      .set({
        failedLoginCount: shouldLock ? 0 : failedLoginCount,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
        updatedAt: now,
      })
      .where(eq(appUsers.authUserId, user.authUserId))

    throw createError({
      statusCode: 401,
      statusMessage: '아이디 또는 비밀번호가 올바르지 않습니다.',
    })
  }

  await db
    .update(appUsers)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    })
    .where(eq(appUsers.authUserId, user.authUserId))

  const token = await createSessionToken({
    userId: user.authUserId,
    authVersion: user.authVersion,
  })
  setSessionCookie(event, token)

  return {
    id: user.authUserId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  }
})
