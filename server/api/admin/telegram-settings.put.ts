import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { telegramSettings } from '#server/db/schema'
import {
  decryptTelegramToken,
  encryptTelegramToken,
  maskTelegramToken,
} from '#server/utils/telegram-crypto'
import { validateTelegramBotToken, validateTelegramChatId } from '#server/utils/telegram-client'

const telegramSettingsSchema = z.object({
  botToken: z
    .string()
    .trim()
    .min(30)
    .max(256)
    .refine(validateTelegramBotToken, '올바른 Telegram Bot Token 형식이 아닙니다.')
    .optional(),
  chatId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .refine(validateTelegramChatId, '숫자 Chat ID 또는 @채널사용자명 형식이 필요합니다.'),
  isEnabled: z.boolean(),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const parsedBody = telegramSettingsSchema.safeParse(await readBody(event))

  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      message: parsedBody.error.issues[0]?.message ?? 'Telegram 설정값을 확인해 주세요.',
    })
  }

  const body = parsedBody.data
  const db = useDb()
  const [current] = await db
    .select()
    .from(telegramSettings)
    .where(eq(telegramSettings.id, 1))
    .limit(1)

  if (!current && !body.botToken) {
    throw createError({
      statusCode: 400,
      message: '처음 설정할 때는 Telegram Bot Token이 필요합니다.',
    })
  }

  const now = new Date()
  let botTokenEncrypted = current?.botTokenEncrypted
  const { telegramEncryptionKey } = useRuntimeConfig()

  if (body.botToken) {
    try {
      botTokenEncrypted = await encryptTelegramToken(body.botToken, telegramEncryptionKey)
    } catch {
      throw createError({
        statusCode: 500,
        message:
          '서버의 NUXT_TELEGRAM_ENCRYPTION_KEY를 32자 이상으로 설정한 뒤 다시 시도해 주세요.',
      })
    }
  } else if (botTokenEncrypted) {
    try {
      await decryptTelegramToken(botTokenEncrypted, telegramEncryptionKey)
    } catch {
      throw createError({
        statusCode: 409,
        message:
          '현재 암호화 키로 기존 Bot Token을 읽을 수 없습니다. Bot Token을 다시 입력해 주세요.',
      })
    }
  }

  if (!botTokenEncrypted) {
    throw createError({
      statusCode: 400,
      message: 'Telegram Bot Token이 필요합니다.',
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
      message: 'Telegram 설정을 저장하지 못했습니다.',
    })
  }

  return {
    configured: true,
    encryptionReady: true,
    configurationStatus: saved.isEnabled ? ('ready' as const) : ('disabled' as const),
    chatId: saved.chatId,
    isEnabled: saved.isEnabled,
    botTokenMasked: maskTelegramToken(saved.botTokenLastFour),
    updatedAt: saved.updatedAt.toISOString(),
  }
})
