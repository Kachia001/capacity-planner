import { eq } from 'drizzle-orm'
import { telegramSettings } from '#server/db/schema'
import { decryptTelegramToken, maskTelegramToken } from '#server/utils/telegram-crypto'

type ConfigurationStatus =
  'not_configured' | 'disabled' | 'ready' | 'encryption_key_missing' | 'encryption_key_mismatch'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  const { telegramEncryptionKey } = useRuntimeConfig()
  const db = useDb()
  const [settings] = await db
    .select({
      chatId: telegramSettings.chatId,
      isEnabled: telegramSettings.isEnabled,
      botTokenEncrypted: telegramSettings.botTokenEncrypted,
      botTokenLastFour: telegramSettings.botTokenLastFour,
      updatedAt: telegramSettings.updatedAt,
    })
    .from(telegramSettings)
    .where(eq(telegramSettings.id, 1))
    .limit(1)

  if (!settings) {
    return {
      configured: false,
      encryptionReady: telegramEncryptionKey.length >= 32,
      configurationStatus: 'not_configured' satisfies ConfigurationStatus,
      chatId: '',
      isEnabled: false,
      botTokenMasked: null,
      updatedAt: null,
    }
  }

  let configurationStatus: ConfigurationStatus

  if (telegramEncryptionKey.length < 32) {
    configurationStatus = 'encryption_key_missing'
  } else {
    try {
      await decryptTelegramToken(settings.botTokenEncrypted, telegramEncryptionKey)
      configurationStatus = settings.isEnabled ? 'ready' : 'disabled'
    } catch {
      configurationStatus = 'encryption_key_mismatch'
    }
  }

  return {
    configured: true,
    encryptionReady: configurationStatus === 'ready' || configurationStatus === 'disabled',
    configurationStatus,
    chatId: settings.chatId,
    isEnabled: settings.isEnabled,
    botTokenMasked: maskTelegramToken(settings.botTokenLastFour),
    updatedAt: settings.updatedAt.toISOString(),
  }
})
