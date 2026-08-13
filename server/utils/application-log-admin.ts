import { z } from 'zod'

export const applicationLogQuerySchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  event: z.string().trim().min(1).max(150).optional(),
  actorUserId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const applicationLogPurgeSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('before'),
    before: z.string().datetime({ offset: true }),
  }),
  z.object({
    mode: z.literal('all'),
    confirmation: z.literal('DELETE_ALL_LOGS'),
  }),
])

export function parseApplicationLogCursor(cursor: string) {
  const separator = cursor.lastIndexOf('::')
  if (separator < 0) return null

  const createdAt = new Date(cursor.slice(0, separator))
  let id: bigint
  try {
    id = BigInt(cursor.slice(separator + 2))
  } catch {
    return null
  }
  if (Number.isNaN(createdAt.getTime()) || id <= BigInt(0)) return null

  return { createdAt, id }
}

export function formatApplicationLogCursor(createdAt: Date, id: bigint) {
  return `${createdAt.toISOString()}::${id}`
}

export function hasValidApplicationLogRange(from?: string, to?: string) {
  return !from || !to || new Date(from) <= new Date(to)
}
