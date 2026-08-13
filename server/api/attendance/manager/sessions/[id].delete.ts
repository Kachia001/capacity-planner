import { eq } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: '올바른 세션 ID가 필요합니다.' })
  }
  const [deleted] = await useDb()
    .delete(attendanceSessions)
    .where(eq(attendanceSessions.id, id))
    .returning({ id: attendanceSessions.id })
  if (!deleted) throw createError({ statusCode: 404, message: '출퇴근 세션을 찾을 수 없습니다.' })
  return { id: deleted.id, deleted: true }
})
