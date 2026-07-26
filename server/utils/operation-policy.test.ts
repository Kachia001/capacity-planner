import { describe, expect, it } from 'vitest'
import { getRegularWindow, resolveOperationStatus } from './operation-policy'

function seoulTime(isoDateAndTime: string) {
  return new Date(`${isoDateAndTime}+09:00`)
}

describe('operation policy', () => {
  it('opens automatically from 08:20 until just before 17:20 Seoul time', () => {
    expect(resolveOperationStatus(null, seoulTime('2026-07-23T08:19:59')).isOpen).toBe(false)
    expect(resolveOperationStatus(null, seoulTime('2026-07-23T08:20:00')).isOpen).toBe(true)
    expect(resolveOperationStatus(null, seoulTime('2026-07-23T17:19:59')).isOpen).toBe(true)
    expect(resolveOperationStatus(null, seoulTime('2026-07-23T17:20:00')).isOpen).toBe(false)
  })

  it('keeps a regular-hours manual close until the regular window ends', () => {
    const now = seoulTime('2026-07-23T10:00:00')
    const { closesAt } = getRegularWindow(now)
    const status = resolveOperationStatus(
      { manualClosedUntil: closesAt, extensionUntil: null },
      now,
    )

    expect(status.isOpen).toBe(false)
    expect(status.isWithinRegularHours).toBe(true)
  })

  it('opens outside regular hours only while an extension is active', () => {
    const now = seoulTime('2026-07-23T18:00:00')

    expect(
      resolveOperationStatus(
        {
          manualClosedUntil: null,
          extensionUntil: seoulTime('2026-07-23T18:30:00'),
        },
        now,
      ).mode,
    ).toBe('extension')
    expect(
      resolveOperationStatus(
        {
          manualClosedUntil: null,
          extensionUntil: seoulTime('2026-07-23T18:00:00'),
        },
        now,
      ).isOpen,
    ).toBe(false)
  })
})
