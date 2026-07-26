const ENCRYPTION_VERSION = 'v1'
const IV_LENGTH = 12
const MINIMUM_SECRET_LENGTH = 32
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function encryptionKey(secret: string) {
  if (secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error('NUXT_TELEGRAM_ENCRYPTION_KEY must be at least 32 characters.')
  }

  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret))
  return await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptTelegramToken(token: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    textEncoder.encode(token),
  )

  return [
    ENCRYPTION_VERSION,
    bytesToBase64Url(iv),
    bytesToBase64Url(new Uint8Array(encrypted)),
  ].join('.')
}

export async function decryptTelegramToken(payload: string, secret: string) {
  const [version, ivValue, encryptedValue, ...extra] = payload.split('.')

  if (version !== ENCRYPTION_VERSION || !ivValue || !encryptedValue || extra.length) {
    throw new Error('Stored Telegram token has an unsupported encryption format.')
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(ivValue) },
    await encryptionKey(secret),
    base64UrlToBytes(encryptedValue),
  )

  return textDecoder.decode(decrypted)
}

export function maskTelegramToken(lastFour: string) {
  return `••••••••${lastFour}`
}
