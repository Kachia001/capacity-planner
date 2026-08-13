import { describe, expect, it } from 'vitest'
import {
  applicationLogPurgeSchema,
  applicationLogQuerySchema,
  formatApplicationLogCursor,
  hasValidApplicationLogRange,
  parseApplicationLogCursor,
} from './application-log-admin'

describe('application log admin input', () => {
  it('parses supported filters and applies the default limit', () => {
    expect(
      applicationLogQuerySchema.parse({
        level: 'error',
        category: 'system',
        event: 'server.error',
        actorUserId: '00000000-0000-4000-8000-000000000001',
        from: '2026-08-01T00:00:00+09:00',
        to: '2026-08-31T23:59:59+09:00',
      }),
    ).toMatchObject({ level: 'error', category: 'system', limit: 50 })
  })

  it('rejects unsupported filters and unsafe limits', () => {
    expect(applicationLogQuerySchema.safeParse({ level: 'fatal' }).success).toBe(false)
    expect(applicationLogQuerySchema.safeParse({ limit: 201 }).success).toBe(false)
    expect(applicationLogQuerySchema.safeParse({ actorUserId: 'not-a-uuid' }).success).toBe(false)
  })

  it('round-trips a stable cursor and rejects malformed cursors', () => {
    const createdAt = new Date('2026-08-14T01:02:03.000Z')
    const id = 9_007_199_254_740_993n
    const cursor = formatApplicationLogCursor(createdAt, id)

    expect(parseApplicationLogCursor(cursor)).toEqual({ createdAt, id })
    expect(parseApplicationLogCursor('invalid')).toBeNull()
    expect(parseApplicationLogCursor(`${createdAt.toISOString()}::0`)).toBeNull()
  })

  it('validates chronological ranges', () => {
    expect(
      hasValidApplicationLogRange('2026-08-01T00:00:00+09:00', '2026-08-02T00:00:00+09:00'),
    ).toBe(true)
    expect(
      hasValidApplicationLogRange('2026-08-02T00:00:00+09:00', '2026-08-01T00:00:00+09:00'),
    ).toBe(false)
  })

  it('requires an explicit confirmation for a full purge', () => {
    expect(
      applicationLogPurgeSchema.safeParse({ mode: 'before', before: '2026-08-01T00:00:00+09:00' })
        .success,
    ).toBe(true)
    expect(applicationLogPurgeSchema.safeParse({ mode: 'all' }).success).toBe(false)
    expect(
      applicationLogPurgeSchema.safeParse({ mode: 'all', confirmation: 'DELETE_ALL_LOGS' }).success,
    ).toBe(true)
  })
})
