import { count, lt } from 'drizzle-orm'
import { applicationLogs } from '#server/db/schema'
import { writeApplicationLog } from '#server/utils/application-log'
import { applicationLogPurgeSchema } from '#server/utils/application-log-admin'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const parsed = applicationLogPurgeSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: '로그 삭제 조건을 확인해 주세요.',
      data: { details: parsed.error.issues },
    })
  }

  const db = useDb()
  return await db.transaction(async tx => {
    let deletedCount: number
    if (parsed.data.mode === 'before') {
      const condition = lt(applicationLogs.createdAt, new Date(parsed.data.before))
      const [summary] = await tx.select({ value: count() }).from(applicationLogs).where(condition)
      deletedCount = summary?.value ?? 0
      await tx.delete(applicationLogs).where(condition)
    } else {
      const [summary] = await tx.select({ value: count() }).from(applicationLogs)
      deletedCount = summary?.value ?? 0
      await tx.delete(applicationLogs)
    }

    await writeApplicationLog(tx, {
      level: 'warn',
      category: 'system',
      event: parsed.data.mode === 'before' ? 'logs.purged_before' : 'logs.purged_all',
      message:
        parsed.data.mode === 'before'
          ? '관리자가 지정한 시각 이전의 서버 로그를 삭제했습니다.'
          : '관리자가 서버 로그를 전체 삭제했습니다.',
      actorUserId: profile.authUserId,
      metadata: {
        deletedCount,
        before: parsed.data.mode === 'before' ? parsed.data.before : null,
      },
    })

    return { deletedCount }
  })
})
