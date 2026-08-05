import { and, eq, isNull, sql } from 'drizzle-orm'
import { appUsers, passwordResetEvents } from '../../../db/schema'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 400, message: '계정 ID가 필요합니다.' })
  }

  const db = useDb()
  const [target] = await db.select().from(appUsers).where(eq(appUsers.authUserId, userId)).limit(1)

  if (!target) {
    throw createError({ statusCode: 404, message: '계정을 찾을 수 없습니다.' })
  }

  if (!canManageAccount(profile.role, target.role)) {
    throw createError({
      statusCode: 403,
      message: '해당 계정의 비밀번호를 초기화할 권한이 없습니다.',
    })
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)
  const resetAt = new Date()

  await db.transaction(async tx => {
    await tx
      .update(passwordResetEvents)
      .set({ supersededAt: resetAt })
      .where(
        and(
          eq(passwordResetEvents.userId, target.authUserId),
          isNull(passwordResetEvents.changedAt),
          isNull(passwordResetEvents.supersededAt),
        ),
      )

    await tx
      .update(appUsers)
      .set({
        passwordHash,
        mustChangePassword: true,
        passwordResetAt: resetAt,
        passwordChangedAt: null,
        passwordResetBy: profile.authUserId,
        authVersion: sql`${appUsers.authVersion} + 1`,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: resetAt,
      })
      .where(eq(appUsers.authUserId, target.authUserId))

    await tx.insert(passwordResetEvents).values({
      userId: target.authUserId,
      resetBy: profile.authUserId,
      resetAt,
    })
  })

  return {
    id: target.authUserId,
    temporaryPassword,
    mustChangePassword: true,
    passwordResetAt: resetAt,
  }
})
