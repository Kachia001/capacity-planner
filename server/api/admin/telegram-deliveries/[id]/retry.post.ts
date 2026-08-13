import { retryTelegramDelivery } from '#server/utils/telegram-outbox'
import { writeApplicationLogBestEffort } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const id = Number.parseInt(getRouterParam(event, 'id') ?? '', 10)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: '올바른 전송 ID가 필요합니다.' })
  }

  const result = await retryTelegramDelivery(id)

  if (!result) {
    throw createError({
      statusCode: 409,
      message: '실패하거나 건너뛴 전송만 다시 시도할 수 있습니다.',
    })
  }

  await writeApplicationLogBestEffort({
    level: 'info',
    category: 'telegram',
    event: 'telegram.delivery_retried',
    message: '관리자가 Telegram 전송을 다시 시도했습니다.',
    actorUserId: profile.authUserId,
    metadata: { deliveryId: id, result: result.result },
  })

  return result
})
