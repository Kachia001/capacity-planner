export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000

type LoginRole = 'admin' | 'manager' | 'worker'

export function isLoginLocked(role: LoginRole, lockedUntil: Date | null, now: Date) {
  return role !== 'admin' && lockedUntil !== null && lockedUntil > now
}

export function getNextLoginFailureState(
  role: LoginRole,
  currentFailedLoginCount: number,
  now: Date,
) {
  if (role === 'admin') {
    return {
      failedAttemptNumber: null,
      failedLoginCount: 0,
      lockedUntil: null,
      accountLocked: false,
      lockExempt: true,
    }
  }

  const failedAttemptNumber = currentFailedLoginCount + 1
  const accountLocked = failedAttemptNumber >= MAX_FAILED_LOGIN_ATTEMPTS

  return {
    failedAttemptNumber,
    failedLoginCount: accountLocked ? 0 : failedAttemptNumber,
    lockedUntil: accountLocked ? new Date(now.getTime() + LOGIN_LOCK_DURATION_MS) : null,
    accountLocked,
    lockExempt: false,
  }
}
