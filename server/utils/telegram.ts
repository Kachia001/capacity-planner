import { eq } from 'drizzle-orm'
import { telegramSettings } from '../db/schema'
import { decryptTelegramToken } from './telegram-crypto'
import { getTelegramFailure, sendTelegramApiMessage, type TelegramFailure } from './telegram-client'

export type TelegramDeliveryResult =
  | { status: 'sent'; messageId: number }
  | { status: 'skipped'; reason: 'not_configured' | 'disabled' }
  | ({ status: 'failed' } & TelegramFailure)

export interface TelegramIssueMessage {
  bayCode: string
  workItemId: number
  workNo: number | null
  workName: string | null
  workDetail: string | null
  partNo: string | null
  isHighAltitude: boolean
  category: 'material_shortage' | 'work_delay' | 'quality_issue' | 'other'
  note: string
  reporterName: string
  reporterRole: 'admin' | 'manager' | 'worker'
  createdAt: Date
}

const categoryLabels: Record<TelegramIssueMessage['category'], string> = {
  material_shortage: '자재부족',
  work_delay: '작업지연',
  quality_issue: '품질이슈',
  other: '기타',
}

const roleLabels: Record<TelegramIssueMessage['reporterRole'], string> = {
  admin: '시스템 관리자',
  manager: '운영 관리자',
  worker: '작업자',
}
const TELEGRAM_MESSAGE_LIMIT = 4000

function displayValue(value: string | number | null) {
  if (value === null || value === '') return '미입력'
  return String(value)
}

export function formatTelegramIssueMessage(issue: TelegramIssueMessage) {
  const createdAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(issue.createdAt)

  const message = [
    '🚨 작업 이슈가 등록되었습니다',
    '',
    `Bay: ${issue.bayCode}`,
    `작업 ID: #${issue.workItemId}`,
    `Work No.: ${displayValue(issue.workNo)}`,
    `작업명: ${displayValue(issue.workName)}`,
    `상세 작업: ${displayValue(issue.workDetail)}`,
    `품번: ${displayValue(issue.partNo)}`,
    `위험 구분: ${issue.isHighAltitude ? '고소작업' : '일반작업'}`,
    `카테고리: ${categoryLabels[issue.category]}`,
    `등록자: ${issue.reporterName} (${roleLabels[issue.reporterRole]})`,
    `등록 시각: ${createdAt}`,
    '',
    '[이슈 내용]',
    issue.note,
  ].join('\n')

  return message.length <= TELEGRAM_MESSAGE_LIMIT
    ? message
    : `${message.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…`
}

export async function sendConfiguredTelegramMessage(text: string): Promise<TelegramDeliveryResult> {
  const db = useDb()
  const [settings] = await db
    .select()
    .from(telegramSettings)
    .where(eq(telegramSettings.id, 1))
    .limit(1)

  if (!settings) {
    return { status: 'skipped', reason: 'not_configured' }
  }

  if (!settings.isEnabled) {
    return { status: 'skipped', reason: 'disabled' }
  }

  const { telegramEncryptionKey } = useRuntimeConfig()
  let botToken: string

  try {
    botToken = await decryptTelegramToken(settings.botTokenEncrypted, telegramEncryptionKey)
  } catch {
    return {
      status: 'failed',
      code: 'encryption_key_mismatch',
      message: '저장된 Telegram Bot Token을 복호화하지 못했습니다.',
      retryable: false,
      retryAfterSeconds: null,
    }
  }

  try {
    const { messageId } = await sendTelegramApiMessage(botToken, settings.chatId, text)
    return { status: 'sent', messageId }
  } catch (error) {
    return {
      status: 'failed',
      ...getTelegramFailure(error),
    }
  }
}

export async function sendTelegramIssueNotification(issue: TelegramIssueMessage) {
  return await sendConfiguredTelegramMessage(formatTelegramIssueMessage(issue))
}
