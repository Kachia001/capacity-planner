import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { appUsers, passwordResetEvents } from '../../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256).optional(),
  newPassword: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.').max(256),
})

export default defineEventHandler(async event => {
  const profile = await requireSessionUser(event)
  const body = changePasswordSchema.parse(await readBody(event))

  const isForcedChange = profile.mustChangePassword

  if (
    !isForcedChange &&
    profile.role !== 'admin' &&
    profile.role !== 'manager' &&
    profile.role !== 'worker'
  ) {
    throw createError({ statusCode: 403, message: '비밀번호를 직접 변경할 권한이 없습니다.' })
  }

  if (!isForcedChange) {
    if (!body.currentPassword) {
      throw createError({ statusCode: 400, message: '현재 비밀번호를 입력해 주세요.' })
    }

    if (!(await verifyPassword(profile.passwordHash, body.currentPassword))) {
      throw createError({ statusCode: 400, message: '현재 비밀번호가 올바르지 않습니다.' })
    }
  }

  if (await verifyPassword(profile.passwordHash, body.newPassword)) {
    throw createError({
      statusCode: 400,
      message: isForcedChange
        ? '임시 비밀번호와 다른 새 비밀번호를 입력해 주세요.'
        : '현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.',
    })
  }

  const passwordHash = await hashPassword(body.newPassword)
  const changedAt = new Date()
  const db = useDb()

  const updated = await db.transaction(async tx => {
    const [nextProfile] = await tx
      .update(appUsers)
      .set({
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: changedAt,
        authVersion: sql`${appUsers.authVersion} + 1`,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: changedAt,
      })
      .where(
        and(
          eq(appUsers.authUserId, profile.authUserId),
          eq(appUsers.authVersion, profile.authVersion),
          eq(appUsers.mustChangePassword, isForcedChange),
        ),
      )
      .returning()

    if (!nextProfile) {
      throw createError({
        statusCode: 409,
        message: '비밀번호 상태가 변경되었습니다. 다시 로그인해 주세요.',
      })
    }

    if (isForcedChange) {
      const [openReset] = await tx
        .select({ id: passwordResetEvents.id })
        .from(passwordResetEvents)
        .where(
          and(
            eq(passwordResetEvents.userId, profile.authUserId),
            isNull(passwordResetEvents.changedAt),
            isNull(passwordResetEvents.supersededAt),
          ),
        )
        .orderBy(desc(passwordResetEvents.resetAt))
        .limit(1)

      if (openReset) {
        await tx
          .update(passwordResetEvents)
          .set({ changedAt })
          .where(eq(passwordResetEvents.id, openReset.id))
      }
    }

    await writeApplicationLog(tx, {
      level: 'info',
      category: 'auth',
      event: 'password.changed',
      message: isForcedChange
        ? '사용자가 임시 비밀번호를 새 비밀번호로 변경했습니다.'
        : '사용자가 비밀번호를 변경했습니다.',
      actorUserId: profile.authUserId,
      metadata: { forcedChange: isForcedChange },
      createdAt: changedAt,
    })

    return nextProfile
  })

  const token = await createSessionToken({
    userId: updated.authUserId,
    authVersion: updated.authVersion,
  })
  setSessionCookie(event, token)

  return {
    id: updated.authUserId,
    email: updated.email,
    displayName: updated.displayName,
    role: updated.role,
    authEmail: updated.email,
    mustChangePassword: false,
  }
})
