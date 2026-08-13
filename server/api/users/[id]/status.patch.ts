import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { appUsers } from '../../../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

const statusSchema = z.object({
  isActive: z.boolean(),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const userId = getRouterParam(event, 'id')
  const body = statusSchema.parse(await readBody(event))

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
      message: '해당 계정의 이용 상태를 변경할 권한이 없습니다.',
    })
  }

  if (target.isActive === body.isActive) {
    return {
      id: target.authUserId,
      isActive: target.isActive,
    }
  }

  const updated = await db.transaction(async tx => {
    const [changed] = await tx
      .update(appUsers)
      .set({
        isActive: body.isActive,
        authVersion: body.isActive ? target.authVersion : sql`${appUsers.authVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(appUsers.authUserId, target.authUserId))
      .returning({ id: appUsers.authUserId, isActive: appUsers.isActive })
    await writeApplicationLog(tx, {
      level: body.isActive ? 'info' : 'warn',
      category: 'account',
      event: body.isActive ? 'account.enabled' : 'account.disabled',
      message: body.isActive
        ? '관리자가 사용자 계정을 활성화했습니다.'
        : '관리자가 사용자 계정을 비활성화했습니다.',
      actorUserId: profile.authUserId,
      metadata: {
        targetUserId: target.authUserId,
        previousStatus: target.isActive ? 'active' : 'inactive',
        changedStatus: body.isActive ? 'active' : 'inactive',
      },
    })
    return changed
  })

  return updated
})
