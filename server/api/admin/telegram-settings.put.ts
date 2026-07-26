import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { telegramSettings } from '#server/db/schema'
import { encryptTelegramToken, maskTelegramToken } from '#server/utils/telegram-crypto'

const telegramSettingsSchema = z.object({
  botToken: z.string().trim().min(30).max(256).optional(),
  chatId: z.string().trim().min(1).max(128),
  isEnabled: z.boolean(),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const body = telegramSettingsSchema.parse(await readBody(event))
  const db = useDb()
  const [current] = await db
    .select()
    .from(telegramSettings)
    .where(eq(telegramSettings.id, 1))
    .limit(1)

  if (!current && !body.botToken) {
    throw createError({
      statusCode: 400,
      statusMessage: '처음 설정할 때는 Telegram Bot Token이 필요합니다.',
    })
  }

  const now = new Date()
  let botTokenEncrypted = current?.botTokenEncrypted

  if (body.botToken) {
    try {
      botTokenEncrypted = await encryptTelegramToken(
        body.botToken,
        useRuntimeConfig().telegramEncryptionKey,
      )
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage:
          '서버의 NUXT_TELEGRAM_ENCRYPTION_KEY를 32자 이상으로 설정한 뒤 다시 시도해 주세요.',
      })
    }
  }

  if (!botTokenEncrypted) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Telegram Bot Token이 필요합니다.',
    })
  }

  const botTokenLastFour = body.botToken ? body.botToken.slice(-4) : current!.botTokenLastFour

  const [saved] = await db
    .insert(telegramSettings)
    .values({
      id: 1,
      botTokenEncrypted,
      botTokenLastFour,
      chatId: body.chatId,
      isEnabled: body.isEnabled,
      updatedBy: profile.authUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: telegramSettings.id,
      set: {
        botTokenEncrypted,
        botTokenLastFour,
        chatId: body.chatId,
        isEnabled: body.isEnabled,
        updatedBy: profile.authUserId,
        updatedAt: now,
      },
    })
    .returning({
      chatId: telegramSettings.chatId,
      isEnabled: telegramSettings.isEnabled,
      botTokenLastFour: telegramSettings.botTokenLastFour,
      updatedAt: telegramSettings.updatedAt,
    })

  if (!saved) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Telegram 설정을 저장하지 못했습니다.',
    })
  }

  return {
    configured: true,
    encryptionReady: true,
    chatId: saved.chatId,
    isEnabled: saved.isEnabled,
    botTokenMasked: maskTelegramToken(saved.botTokenLastFour),
    updatedAt: saved.updatedAt.toISOString(),
  }
})
