import { desc, eq, isNull } from 'drizzle-orm'
import { operationControl, operationSessions, type OperationControl } from '../db/schema'
import {
  createOperationSessionId,
  getRegularCloseForOperationDate,
  getSeoulOperationDate,
} from './operation-session'
import { writeApplicationLog } from './application-log'

export const OPERATION_TIME_ZONE = 'Asia/Seoul'
export const REGULAR_OPEN_MINUTE = 8 * 60 + 20
export const REGULAR_CLOSE_MINUTE = 17 * 60 + 20

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000

type OperationControlValues = Pick<OperationControl, 'manualClosedUntil' | 'extensionUntil'>

export function calculateExtensionUntil(
  now: Date,
  currentExtensionUntil: Date | null | undefined,
  extensionMinutes: number,
) {
  const baseTime =
    currentExtensionUntil && currentExtensionUntil.getTime() > now.getTime()
      ? currentExtensionUntil.getTime()
      : now.getTime()

  return new Date(baseTime + extensionMinutes * 60 * 1000)
}

function seoulDateParts(now: Date) {
  const shifted = new Date(now.getTime() + SEOUL_OFFSET_MS)

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

function seoulWallClockToDate(
  year: number,
  month: number,
  date: number,
  hour: number,
  minute: number,
) {
  return new Date(Date.UTC(year, month, date, hour - 9, minute))
}

export function getRegularWindow(now = new Date()) {
  const parts = seoulDateParts(now)
  const opensAt = seoulWallClockToDate(parts.year, parts.month, parts.date, 8, 20)
  const closesAt = seoulWallClockToDate(parts.year, parts.month, parts.date, 17, 20)
  const isWithinRegularHours =
    parts.minute >= REGULAR_OPEN_MINUTE && parts.minute < REGULAR_CLOSE_MINUTE

  return { opensAt, closesAt, isWithinRegularHours }
}

function getNextRegularOpen(now: Date) {
  const parts = seoulDateParts(now)
  let opensAt = seoulWallClockToDate(parts.year, parts.month, parts.date, 8, 20)

  if (opensAt <= now) {
    opensAt = new Date(opensAt.getTime() + 24 * 60 * 60 * 1000)
  }

  return opensAt
}

export function resolveOperationStatus(
  control: OperationControlValues | null | undefined,
  now = new Date(),
) {
  const regularWindow = getRegularWindow(now)
  const manualClosedUntil = control?.manualClosedUntil ?? null
  const extensionUntil = control?.extensionUntil ?? null
  const isManuallyClosed =
    regularWindow.isWithinRegularHours &&
    manualClosedUntil !== null &&
    manualClosedUntil.getTime() > now.getTime()
  const hasActiveExtension =
    !regularWindow.isWithinRegularHours &&
    extensionUntil !== null &&
    extensionUntil.getTime() > now.getTime()

  const isOpen = regularWindow.isWithinRegularHours ? !isManuallyClosed : hasActiveExtension
  const mode = isOpen
    ? regularWindow.isWithinRegularHours
      ? ('regular' as const)
      : ('extension' as const)
    : ('closed' as const)
  const scheduledExtensionUntil =
    extensionUntil !== null && extensionUntil.getTime() > regularWindow.closesAt.getTime()
      ? extensionUntil
      : null
  const closesAt =
    mode === 'regular'
      ? (scheduledExtensionUntil ?? regularWindow.closesAt)
      : mode === 'extension'
        ? extensionUntil
        : null

  return {
    isOpen,
    mode,
    isWithinRegularHours: regularWindow.isWithinRegularHours,
    regularOpensAt: '08:20',
    regularClosesAt: '17:20',
    closesAt,
    nextRegularOpensAt:
      regularWindow.isWithinRegularHours && isManuallyClosed
        ? getNextRegularOpen(now)
        : !regularWindow.isWithinRegularHours
          ? getNextRegularOpen(now)
          : null,
    serverNow: now,
    timeZone: OPERATION_TIME_ZONE,
  }
}

export async function getOperationStatus(now = new Date()) {
  const db = useDb()
  return await db.transaction(async tx => {
    const [control] = await tx
      .select()
      .from(operationControl)
      .where(eq(operationControl.id, 1))
      .limit(1)
      .for('update')
    const status = resolveOperationStatus(control, now)
    const operationDate = getSeoulOperationDate(now)
    const regularWindow = getRegularWindow(now)
    let [activeSession] = await tx
      .select()
      .from(operationSessions)
      .where(isNull(operationSessions.closedAt))
      .orderBy(desc(operationSessions.openedAt))
      .limit(1)

    const extensionBridgesCurrentRegularOpen = Boolean(
      control?.extensionUntil &&
      control.extensionUntil.getTime() >= regularWindow.opensAt.getTime() &&
      activeSession &&
      control.extensionUntil.getTime() > activeSession.openedAt.getTime(),
    )
    if (
      activeSession &&
      (!status.isOpen ||
        (activeSession.operationDate !== operationDate && !extensionBridgesCurrentRegularOpen))
    ) {
      const regularClose = getRegularCloseForOperationDate(activeSession.operationDate)
      const expiredExtension =
        control?.extensionUntil &&
        control.extensionUntil.getTime() > activeSession.openedAt.getTime() &&
        control.extensionUntil.getTime() <= now.getTime()
          ? control.extensionUntil
          : null
      const closedAt = expiredExtension ?? (regularClose <= now ? regularClose : now)

      await tx
        .update(operationSessions)
        .set({ closedAt, updatedAt: now })
        .where(eq(operationSessions.id, activeSession.id))
      await writeApplicationLog(tx, {
        level: 'info',
        category: 'operation',
        event: 'operation.automatically_closed',
        message: '서버가 운영 종료 시각에 맞춰 작업 운영을 자동 종료했습니다.',
        metadata: { operationSessionId: activeSession.id, closedAt },
        createdAt: now,
      })
      activeSession = undefined
    }

    if (status.isOpen && !activeSession) {
      const openedDuringRegularWindow =
        status.mode === 'regular' ||
        (control?.updatedAt && control.updatedAt.getTime() < regularWindow.closesAt.getTime())
      const openedAt = openedDuringRegularWindow
        ? regularWindow.opensAt
        : (control?.updatedAt ?? now)

      const operationSessionId = createOperationSessionId(openedAt)
      await tx.insert(operationSessions).values({
        id: operationSessionId,
        operationDate: getSeoulOperationDate(openedAt),
        openedAt,
        updatedAt: now,
      })
      await writeApplicationLog(tx, {
        level: 'info',
        category: 'operation',
        event: 'operation.automatically_opened',
        message: '서버가 정규 운영 시각에 맞춰 작업 운영을 자동 시작했습니다.',
        metadata: { operationSessionId, openedAt, mode: status.mode },
        createdAt: now,
      })
    }

    return status
  })
}

export async function requireOperationOpen(now = new Date()) {
  const status = await getOperationStatus(now)

  if (!status.isOpen) {
    throw createError({
      statusCode: 423,
      message: status.isWithinRegularHours
        ? '현재 운영이 Close 상태입니다. 관리자가 Open한 후 작업할 수 있습니다.'
        : '정규 운영시간(08:20~17:20) 외에는 관리자가 연장 시간을 정하고 Open해야 합니다.',
    })
  }

  return status
}
