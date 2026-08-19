import { describe, expect, it } from 'vitest'
import { getNextLoginFailureState, isLoginLocked, LOGIN_LOCK_DURATION_MS } from './login-lock'

describe('login lock policy', () => {
  const now = new Date('2026-08-19T00:00:00.000Z')

  it('does not apply an existing login lock to admins', () => {
    const lockedUntil = new Date(now.getTime() + LOGIN_LOCK_DURATION_MS)

    expect(isLoginLocked('admin', lockedUntil, now)).toBe(false)
    expect(isLoginLocked('manager', lockedUntil, now)).toBe(true)
    expect(isLoginLocked('worker', lockedUntil, now)).toBe(true)
  })

  it('does not accumulate failures or lock admins', () => {
    expect(getNextLoginFailureState('admin', 99, now)).toEqual({
      failedAttemptNumber: null,
      failedLoginCount: 0,
      lockedUntil: null,
      accountLocked: false,
      lockExempt: true,
    })
  })

  it('locks non-admin accounts for 15 minutes after five failures', () => {
    expect(getNextLoginFailureState('worker', 3, now)).toMatchObject({
      failedAttemptNumber: 4,
      failedLoginCount: 4,
      lockedUntil: null,
      accountLocked: false,
      lockExempt: false,
    })

    expect(getNextLoginFailureState('manager', 4, now)).toEqual({
      failedAttemptNumber: 5,
      failedLoginCount: 0,
      lockedUntil: new Date(now.getTime() + LOGIN_LOCK_DURATION_MS),
      accountLocked: true,
      lockExempt: false,
    })
  })
})
