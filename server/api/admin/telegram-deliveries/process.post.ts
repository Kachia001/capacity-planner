import { processTelegramOutbox } from '#server/utils/telegram-outbox'
import { writeApplicationLogBestEffort } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const result = await processTelegramOutbox({ limit: 20 })
  await writeApplicationLogBestEffort({
    level: result.failed > 0 ? 'warn' : 'info',
    category: 'telegram',
    event: 'telegram.deliveries_processed',
    message: '관리자가 Telegram 전송 대기열을 수동 처리했습니다.',
    actorUserId: profile.authUserId,
    metadata: { ...result },
  })
  return result
})
