import { processTelegramOutbox } from '#server/utils/telegram-outbox'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  return await processTelegramOutbox({ limit: 20 })
})
