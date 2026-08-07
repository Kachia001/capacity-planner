import { describe, expect, it, vi } from 'vitest'
import {
  createOperationSessionId,
  getRegularCloseForOperationDate,
  getSeoulOperationDate,
} from './operation-session'

describe('operation session', () => {
  it('uses the Seoul calendar date for the operation date', () => {
    expect(getSeoulOperationDate(new Date('2026-08-06T15:30:00.000Z'))).toBe('2026-08-07')
  })

  it('prefixes the unique session id with the Seoul date', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-4234-8234-123456789abc')

    expect(createOperationSessionId(new Date('2026-08-06T15:30:00.000Z'))).toBe(
      '20260807-12345678-1234-4234-8234-123456789abc',
    )
  })

  it('converts an operation date to its regular Seoul close time', () => {
    expect(getRegularCloseForOperationDate('2026-08-07')).toEqual(
      new Date('2026-08-07T08:20:00.000Z'),
    )
  })
})
