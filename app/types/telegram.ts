export type TelegramConfigurationStatus =
  'not_configured' | 'disabled' | 'ready' | 'encryption_key_missing' | 'encryption_key_mismatch'

export interface TelegramSettingsResponse {
  configured: boolean
  encryptionReady: boolean
  configurationStatus: TelegramConfigurationStatus
  chatId: string
  isEnabled: boolean
  botTokenMasked: string | null
  updatedAt: string | null
}

export type TelegramDeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped'

export interface TelegramDeliverySummary {
  pending: number
  processing: number
  sent: number
  failed: number
  skipped: number
}

export interface TelegramDeliveryListItem {
  id: number
  workItemId: number
  issueId: number | null
  status: TelegramDeliveryStatus
  attemptCount: number
  nextAttemptAt: string
  lastAttemptAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  telegramMessageId: string | null
  sentAt: string | null
  createdAt: string
}

export interface TelegramDeliveriesResponse {
  summary: TelegramDeliverySummary
  deliveries: TelegramDeliveryListItem[]
}
