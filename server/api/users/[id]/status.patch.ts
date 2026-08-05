import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { appUsers } from '../../../db/schema'

const statusSchema = z.object({
  isActive: z.boolean(),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const userId = getRouterParam(event, 'id')
  const body = statusSchema.parse(await readBody(event))

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: '계정 ID가 필요합니다.' })
  }

  const db = useDb()
  const [target] = await db.select().from(appUsers).where(eq(appUsers.authUserId, userId)).limit(1)

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: '계정을 찾을 수 없습니다.' })
  }

  if (!canManageAccount(profile.role, target.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: '해당 계정의 이용 상태를 변경할 권한이 없습니다.',
    })
  }

  if (target.isActive === body.isActive) {
    return {
      id: target.authUserId,
      isActive: target.isActive,
    }
  }

  const [updated] = await db
    .update(appUsers)
    .set({
      isActive: body.isActive,
      authVersion: body.isActive ? target.authVersion : sql`${appUsers.authVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(appUsers.authUserId, target.authUserId))
    .returning({ id: appUsers.authUserId, isActive: appUsers.isActive })

  return updated
})
