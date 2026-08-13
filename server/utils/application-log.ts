import { applicationLogs, type ApplicationLog } from '../db/schema'
import type { DatabaseExecutor } from '../infrastructure/database/database.types'

const MAX_METADATA_DEPTH = 6
const MAX_METADATA_LENGTH = 16_000
const MAX_STACK_LENGTH = 32_000

export type ApplicationLogLevel = ApplicationLog['level']

export type ApplicationLogInput = {
  level: ApplicationLogLevel
  category: string
  event?: string | null
  message: string
  actorUserId?: string | null
  metadata?: Record<string, unknown> | null
  errorStack?: string | null
  createdAt?: Date
}

function isSensitiveKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return (
    normalized.includes('password') ||
    normalized.includes('passphrase') ||
    normalized.includes('authorization') ||
    normalized.includes('credential') ||
    normalized.includes('apikey') ||
    normalized.includes('privatekey') ||
    normalized.endsWith('token') ||
    normalized.endsWith('secret') ||
    normalized.endsWith('cookie') ||
    normalized === 'session'
  )
}

export function sanitizeLogText(value: string) {
  return value
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, '[민감정보제거됨]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^:\s/]+:)[^@\s/]+@/gi, '$1[민감정보 제거됨]@')
    .replace(
      /((?:["']?)(?:password|passphrase|password[_-]?hash|access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|authorization|proxy[_-]?authorization|cookie|set-cookie|session(?:[_-]?(?:id|token|secret))?|client[_-]?secret|private[_-]?key|secret)(?:["']?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}&}]+)/gi,
      '$1[민감정보 제거됨]',
    )
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_METADATA_DEPTH) return '[깊이 제한됨]'
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return sanitizeLogText(value).slice(0, 2_000)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeValue(item, depth + 1))
  if (typeof value !== 'object') return String(value).slice(0, 2_000)

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 100)
      .map(([key, child]) => [
        key,
        isSensitiveKey(key) ? '[민감정보 제거됨]' : sanitizeValue(child, depth + 1),
      ]),
  )
}

export function sanitizeLogMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) return null

  const sanitized = sanitizeValue(metadata, 0) as Record<string, unknown>
  const serialized = JSON.stringify(sanitized)

  if (serialized.length <= MAX_METADATA_LENGTH) return sanitized

  return {
    truncated: true,
    preview: serialized.slice(0, MAX_METADATA_LENGTH),
  }
}

export function getErrorStack(error: unknown): string | null {
  if (error instanceof Error) {
    return sanitizeLogText(error.stack ?? error.message).slice(0, MAX_STACK_LENGTH)
  }
  if (typeof error === 'string') return sanitizeLogText(error).slice(0, MAX_STACK_LENGTH)
  return null
}

export function shouldCaptureApplicationError(statusCode: number) {
  return statusCode >= 500
}

export async function writeApplicationLog(
  db: DatabaseExecutor,
  input: ApplicationLogInput,
): Promise<void> {
  await db.insert(applicationLogs).values({
    level: input.level,
    category: input.category,
    event: input.event ?? null,
    message: sanitizeLogText(input.message),
    actorUserId: input.actorUserId ?? null,
    metadata: sanitizeLogMetadata(input.metadata),
    errorStack:
      input.level === 'error'
        ? (input.errorStack && sanitizeLogText(input.errorStack).slice(0, MAX_STACK_LENGTH)) || null
        : null,
    createdAt: input.createdAt,
  })
}

export async function writeApplicationLogBestEffort(input: ApplicationLogInput): Promise<void> {
  try {
    await writeApplicationLog(useDb(), input)
  } catch (error) {
    console.error('[application-log] 로그 저장에 실패했습니다.', error)
  }
}
