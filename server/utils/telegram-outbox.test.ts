import { describe, expect, it } from 'vitest'
import { calculateTelegramRetryAt } from './telegram-outbox'

describe('Telegram outbox retry scheduling', () => {
  const now = new Date('2026-07-27T00:00:00.000Z')

  it('uses increasing retry delays', () => {
    expect(calculateTelegramRetryAt(now, 1, null).toISOString()).toBe('2026-07-27T00:00:30.000Z')
    expect(calculateTelegramRetryAt(now, 2, null).toISOString()).toBe('2026-07-27T00:02:00.000Z')
    expect(calculateTelegramRetryAt(now, 4, null).toISOString()).toBe('2026-07-27T00:30:00.000Z')
  })

  it('honors a longer Telegram retry_after value', () => {
    expect(calculateTelegramRetryAt(now, 1, 90).toISOString()).toBe('2026-07-27T00:01:30.000Z')
  })
})
