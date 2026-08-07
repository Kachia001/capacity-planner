import { describe, expect, it } from 'vitest'
import {
  calculateExtensionUntil,
  getRegularWindow,
  resolveOperationStatus,
} from './operation-policy'

function seoulTime(isoDateAndTime: string) {
  return new Date(`${isoDateAndTime}+09:00`)
}

describe('operation policy', () => {
  it('adds extension minutes to an active extension end time', () => {
    const now = seoulTime('2026-07-23T18:00:00')
    const currentExtensionUntil = seoulTime('2026-07-23T19:00:00')

    expect(calculateExtensionUntil(now, currentExtensionUntil, 30)).toEqual(
      seoulTime('2026-07-23T19:30:00'),
    )
  })

  it('adds extension minutes from now when no active extension remains', () => {
    const now = seoulTime('2026-07-23T18:00:00')
    const expiredExtensionUntil = seoulTime('2026-07-23T17:30:00')

    expect(calculateExtensionUntil(now, expiredExtensionUntil, 30)).toEqual(
      seoulTime('2026-07-23T18:30:00'),
    )
  })

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

  it('uses a scheduled extension as the close time during regular hours', () => {
    const now = seoulTime('2026-07-23T12:00:00')
    const extensionUntil = seoulTime('2026-07-23T18:20:00')
    const status = resolveOperationStatus({ manualClosedUntil: null, extensionUntil }, now)

    expect(status.mode).toBe('regular')
    expect(status.closesAt).toEqual(extensionUntil)
  })
})
