import { describe, expect, it } from 'vitest'
import { attendanceCorrectionSchema, attendanceRangeSchema } from './attendance-input'

describe('attendance input', () => {
  it('accepts a valid half-open UTC range', () => {
    const parsed = attendanceRangeSchema.parse({
      start: '2026-07-31T15:00:00.000Z',
      end: '2026-08-01T15:00:00.000Z',
    })
    expect(parsed.end.getTime() - parsed.start.getTime()).toBe(86_400_000)
  })

  it('rejects non-UTC or reversed ranges', () => {
    expect(() =>
      attendanceRangeSchema.parse({
        start: '2026-08-01T00:00:00+09:00',
        end: '2026-08-02T00:00:00+09:00',
      }),
    ).toThrow()
    expect(() =>
      attendanceRangeSchema.parse({
        start: '2026-08-02T00:00:00Z',
        end: '2026-08-01T00:00:00Z',
      }),
    ).toThrow()
  })

  it('allows a manager to invalidate a clock-out with null', () => {
    expect(attendanceCorrectionSchema.parse({ endedAt: null })).toEqual({ endedAt: null })
  })
})
