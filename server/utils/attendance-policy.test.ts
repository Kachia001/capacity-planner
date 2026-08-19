import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ATTENDANCE_ADMIN_TARGET_FORBIDDEN,
  canManageAttendance,
  requireAttendanceTargetAccess,
} from './attendance-policy'

describe('attendance target policy', () => {
  beforeEach(() => {
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('HTTP error'), input))
  })

  it('allows admins to manage attendance for every role', () => {
    expect(canManageAttendance('admin', 'admin')).toBe(true)
    expect(canManageAttendance('admin', 'manager')).toBe(true)
    expect(canManageAttendance('admin', 'worker')).toBe(true)
  })

  it('keeps manager access to managers and workers', () => {
    expect(canManageAttendance('manager', 'manager')).toBe(true)
    expect(canManageAttendance('manager', 'worker')).toBe(true)
  })

  it('rejects manager access to admin attendance with a stable 403 code', () => {
    expect(canManageAttendance('manager', 'admin')).toBe(false)

    expect(() => requireAttendanceTargetAccess('manager', 'admin')).toThrowError(
      expect.objectContaining({
        statusCode: 403,
        data: { code: ATTENDANCE_ADMIN_TARGET_FORBIDDEN },
      }),
    )
  })

  it('does not grant attendance management to workers', () => {
    expect(canManageAttendance('worker', 'worker')).toBe(false)
  })
})
