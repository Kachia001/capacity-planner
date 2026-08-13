import { eq } from 'drizzle-orm'
import { attendanceSessions } from '#server/db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: '올바른 세션 ID가 필요합니다.' })
  }
  const deleted = await useDb().transaction(async tx => {
    const [removed] = await tx
      .delete(attendanceSessions)
      .where(eq(attendanceSessions.id, id))
      .returning({ id: attendanceSessions.id, userId: attendanceSessions.userId })
    if (removed) {
      await writeApplicationLog(tx, {
        level: 'warn',
        category: 'attendance',
        event: 'attendance.session_deleted',
        message: '관리자가 출퇴근 기록을 삭제했습니다.',
        actorUserId: profile.authUserId,
        metadata: { attendanceSessionId: id, targetUserId: removed.userId },
      })
    }
    return removed
  })
  if (!deleted) throw createError({ statusCode: 404, message: '출퇴근 세션을 찾을 수 없습니다.' })
  return { id: deleted.id, deleted: true }
})
