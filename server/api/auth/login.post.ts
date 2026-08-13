import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { appUsers } from '../../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

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
    await writeApplicationLog(db, {
      level: 'warn',
      category: 'auth',
      event: 'login.failed',
      message: '등록되지 않은 계정으로 로그인을 시도했습니다.',
      metadata: { accountMatched: false },
      createdAt: now,
    })
    throw createError({
      statusCode: 401,
      message: '아이디 또는 비밀번호가 올바르지 않습니다.',
    })
  }

  if (!user.isActive) {
    await writeApplicationLog(db, {
      level: 'warn',
      category: 'auth',
      event: 'login.failed',
      message: '비활성화된 계정으로 로그인을 시도했습니다.',
      actorUserId: user.authUserId,
      metadata: { reason: 'account_disabled' },
      createdAt: now,
    })
    throw createError({
      statusCode: 401,
      message: '이용이 정지된 계정입니다.',
      data: { code: 'ACCOUNT_DISABLED' },
    })
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    await writeApplicationLog(db, {
      level: 'warn',
      category: 'auth',
      event: 'login.failed',
      message: '잠긴 계정으로 로그인을 시도했습니다.',
      actorUserId: user.authUserId,
      metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil },
      createdAt: now,
    })
    throw createError({
      statusCode: 429,
      message: '로그인 시도가 잠겼습니다. 잠시 후 다시 시도해주세요.',
    })
  }

  const passwordMatches = await verifyPassword(user.passwordHash, body.password)

  if (!passwordMatches) {
    const failedLoginCount = user.failedLoginCount + 1
    const shouldLock = failedLoginCount >= MAX_FAILED_ATTEMPTS

    await db.transaction(async tx => {
      await tx
        .update(appUsers)
        .set({
          failedLoginCount: shouldLock ? 0 : failedLoginCount,
          lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
          updatedAt: now,
        })
        .where(eq(appUsers.authUserId, user.authUserId))
      await writeApplicationLog(tx, {
        level: 'warn',
        category: 'auth',
        event: 'login.failed',
        message: shouldLock
          ? '비밀번호 오류가 반복되어 계정 로그인을 잠갔습니다.'
          : '올바르지 않은 비밀번호로 로그인을 시도했습니다.',
        actorUserId: user.authUserId,
        metadata: { reason: 'password_mismatch', failedLoginCount, accountLocked: shouldLock },
        createdAt: now,
      })
    })

    throw createError({
      statusCode: 401,
      message: '아이디 또는 비밀번호가 올바르지 않습니다.',
    })
  }

  await db.transaction(async tx => {
    await tx
      .update(appUsers)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(appUsers.authUserId, user.authUserId))
    await writeApplicationLog(tx, {
      level: 'info',
      category: 'auth',
      event: 'login.success',
      message: '사용자가 로그인했습니다.',
      actorUserId: user.authUserId,
      createdAt: now,
    })
  })

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
    mustChangePassword: user.mustChangePassword,
  }
})
