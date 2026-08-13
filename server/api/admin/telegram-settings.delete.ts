import { eq } from 'drizzle-orm'
import { telegramSettings } from '#server/db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  await useDb().transaction(async tx => {
    await tx.delete(telegramSettings).where(eq(telegramSettings.id, 1))
    await writeApplicationLog(tx, {
      level: 'warn',
      category: 'telegram',
      event: 'telegram.settings_deleted',
      message: '관리자가 Telegram 알림 설정을 삭제했습니다.',
      actorUserId: profile.authUserId,
    })
  })

  return { deleted: true }
})
