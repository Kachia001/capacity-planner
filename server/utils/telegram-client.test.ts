import { describe, expect, it } from 'vitest'
import {
  parseTelegramApiResponse,
  TelegramApiError,
  validateTelegramBotToken,
  validateTelegramChatId,
} from './telegram-client'

describe('Telegram API response handling', () => {
  it('returns a successful Telegram result', () => {
    expect(
      parseTelegramApiResponse({
        ok: true,
        result: { message_id: 101 },
      }),
    ).toEqual({ message_id: 101 })
  })

  it('preserves flood-control retry information', () => {
    expect.assertions(4)

    try {
      parseTelegramApiResponse({
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
        parameters: { retry_after: 17 },
      })
    } catch (error) {
      expect(error).toBeInstanceOf(TelegramApiError)
      expect((error as TelegramApiError).failure.code).toBe('telegram_429')
      expect((error as TelegramApiError).failure.retryable).toBe(true)
      expect((error as TelegramApiError).failure.retryAfterSeconds).toBe(17)
    }
  })

  it('treats malformed responses as retryable failures', () => {
    expect(() => parseTelegramApiResponse({ result: true })).toThrow(TelegramApiError)
  })
})

describe('Telegram setting validation', () => {
  it('accepts a BotFather-style token and supported chat identifiers', () => {
    expect(validateTelegramBotToken('123456789:abcdefghijklmnopqrstuvwxyz_ABCDEFG')).toBe(true)
    expect(validateTelegramChatId('-1001234567890')).toBe(true)
    expect(validateTelegramChatId('@capacity_alerts')).toBe(true)
  })

  it('rejects malformed tokens and chat identifiers', () => {
    expect(validateTelegramBotToken('not-a-token-without-a-colon')).toBe(false)
    expect(validateTelegramChatId('channel name')).toBe(false)
  })
})
