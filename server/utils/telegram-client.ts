const BOT_TOKEN_PATTERN = /^\d{6,15}:[A-Za-z0-9_-]{30,200}$/u
const NUMERIC_CHAT_ID_PATTERN = /^-?\d{1,20}$/u
const USERNAME_CHAT_ID_PATTERN = /^@[A-Za-z][A-Za-z0-9_]{4,31}$/u

interface TelegramResponseParameters {
  retry_after?: number
}

type TelegramApiResponse<T> =
  | {
      ok: true
      result: T
    }
  | {
      ok: false
      error_code?: number
      description?: string
      parameters?: TelegramResponseParameters
    }

interface TelegramSentMessage {
  message_id: number
}

interface TelegramBotUser {
  id: number
  is_bot: boolean
  username?: string
}

export interface TelegramFailure {
  code: string
  message: string
  retryable: boolean
  retryAfterSeconds: number | null
}

export class TelegramApiError extends Error {
  readonly failure: TelegramFailure

  constructor(failure: TelegramFailure) {
    super(failure.message)
    this.name = 'TelegramApiError'
    this.failure = failure
  }
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/u, '')
}

function telegramMethodUrl(botToken: string, method: string) {
  const configuredBaseUrl = useRuntimeConfig().telegramApiBaseUrl || 'https://api.telegram.org'
  return `${normalizeBaseUrl(configuredBaseUrl)}/bot${botToken}/${method}`
}

function safeDescription(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 'Telegram API 요청이 실패했습니다.'
  return value.trim().slice(0, 500)
}

function isRetryableStatus(errorCode: number | undefined) {
  return errorCode === 429 || (typeof errorCode === 'number' && errorCode >= 500)
}

export function validateTelegramBotToken(value: string) {
  return BOT_TOKEN_PATTERN.test(value)
}

export function validateTelegramChatId(value: string) {
  return NUMERIC_CHAT_ID_PATTERN.test(value) || USERNAME_CHAT_ID_PATTERN.test(value)
}

export function parseTelegramApiResponse<T>(value: unknown): T {
  if (!value || typeof value !== 'object' || !('ok' in value)) {
    throw new TelegramApiError({
      code: 'invalid_response',
      message: 'Telegram API가 올바르지 않은 응답을 반환했습니다.',
      retryable: true,
      retryAfterSeconds: null,
    })
  }

  const response = value as TelegramApiResponse<T>

  if (response.ok === true) {
    return response.result
  }

  const errorCode = typeof response.error_code === 'number' ? response.error_code : undefined
  const retryAfterSeconds =
    typeof response.parameters?.retry_after === 'number' &&
    Number.isFinite(response.parameters.retry_after)
      ? Math.max(1, Math.ceil(response.parameters.retry_after))
      : null

  throw new TelegramApiError({
    code: errorCode ? `telegram_${errorCode}` : 'telegram_error',
    message: safeDescription(response.description),
    retryable: isRetryableStatus(errorCode),
    retryAfterSeconds,
  })
}

async function callTelegramMethod<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
) {
  try {
    const response = await $fetch<unknown>(telegramMethodUrl(botToken, method), {
      method: 'POST',
      body,
      timeout: 10_000,
      ignoreResponseError: true,
    })

    return parseTelegramApiResponse<T>(response)
  } catch (error) {
    if (error instanceof TelegramApiError) throw error

    throw new TelegramApiError({
      code: 'network_error',
      message: 'Telegram API에 연결하지 못했습니다.',
      retryable: true,
      retryAfterSeconds: null,
    })
  }
}

export async function getTelegramBot(botToken: string) {
  return await callTelegramMethod<TelegramBotUser>(botToken, 'getMe')
}

export async function sendTelegramApiMessage(botToken: string, chatId: string, text: string) {
  const result = await callTelegramMethod<TelegramSentMessage>(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
  })

  return { messageId: result.message_id }
}

export function getTelegramFailure(error: unknown): TelegramFailure {
  if (error instanceof TelegramApiError) return error.failure

  return {
    code: 'unknown_error',
    message: 'Telegram 메시지를 전송하지 못했습니다.',
    retryable: true,
    retryAfterSeconds: null,
  }
}
