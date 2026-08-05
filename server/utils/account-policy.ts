import type { AppRole } from './auth'

export function canManageAccount(actorRole: AppRole, targetRole: AppRole) {
  if (actorRole === 'admin') {
    return targetRole === 'manager' || targetRole === 'worker'
  }

  return actorRole === 'manager' && targetRole === 'worker'
}
