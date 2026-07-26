import { eq } from 'drizzle-orm'
import { telegramSettings } from '#server/db/schema'
import { maskTelegramToken } from '#server/utils/telegram-crypto'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  const encryptionReady = useRuntimeConfig().telegramEncryptionKey.length >= 32
  const db = useDb()
  const [settings] = await db
    .select({
      chatId: telegramSettings.chatId,
      isEnabled: telegramSettings.isEnabled,
      botTokenLastFour: telegramSettings.botTokenLastFour,
      updatedAt: telegramSettings.updatedAt,
    })
    .from(telegramSettings)
    .where(eq(telegramSettings.id, 1))
    .limit(1)

  if (!settings) {
    return {
      configured: false,
      encryptionReady,
      chatId: '',
      isEnabled: false,
      botTokenMasked: null,
      updatedAt: null,
    }
  }

  return {
    configured: true,
    encryptionReady,
    chatId: settings.chatId,
    isEnabled: settings.isEnabled,
    botTokenMasked: maskTelegramToken(settings.botTokenLastFour),
    updatedAt: settings.updatedAt.toISOString(),
  }
})
