import type { AppRole } from './auth'

export const ATTENDANCE_ADMIN_TARGET_FORBIDDEN = 'ATTENDANCE_ADMIN_TARGET_FORBIDDEN'

export function canManageAttendance(actorRole: AppRole, targetRole: AppRole) {
  if (actorRole === 'admin') return true

  return actorRole === 'manager' && targetRole !== 'admin'
}

export function requireAttendanceTargetAccess(actorRole: AppRole, targetRole: AppRole) {
  if (!canManageAttendance(actorRole, targetRole)) {
    throw createError({
      statusCode: 403,
      message: 'Admin 사용자의 출퇴근 정보를 관리할 권한이 없습니다.',
      data: { code: ATTENDANCE_ADMIN_TARGET_FORBIDDEN },
    })
  }
}
