export interface TelegramSettingsResponse {
  configured: boolean
  encryptionReady: boolean
  chatId: string
  isEnabled: boolean
  botTokenMasked: string | null
  updatedAt: string | null
}
