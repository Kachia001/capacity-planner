import { desc, eq, isNull } from 'drizzle-orm'
import { operationControl, operationSessions } from '../../db/schema'
import { getRegularWindow, resolveOperationStatus } from '../../utils/operation-policy'
import {
  createOperationSessionId,
  getRegularCloseForOperationDate,
  getSeoulOperationDate,
} from '../../utils/operation-session'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const now = new Date()
  const regularWindow = getRegularWindow(now)
  const manualClosedUntil = regularWindow.isWithinRegularHours ? regularWindow.closesAt : null
  const db = useDb()
  const control = await db.transaction(async tx => {
    const [existingControl] = await tx
      .select()
      .from(operationControl)
      .where(eq(operationControl.id, 1))
      .limit(1)
      .for('update')
    const previousStatus = resolveOperationStatus(existingControl, now)

    const [updatedControl] = await tx
      .insert(operationControl)
      .values({
        id: 1,
        manualClosedUntil,
        extensionUntil: null,
        updatedBy: profile.authUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: operationControl.id,
        set: {
          manualClosedUntil,
          extensionUntil: null,
          updatedBy: profile.authUserId,
          updatedAt: now,
        },
      })
      .returning()

    const [activeSession] = await tx
      .select({ id: operationSessions.id, openedAt: operationSessions.openedAt })
      .from(operationSessions)
      .where(isNull(operationSessions.closedAt))
      .orderBy(desc(operationSessions.openedAt))
      .limit(1)

    if (activeSession) {
      const expiredExtension =
        existingControl?.extensionUntil &&
        existingControl.extensionUntil > activeSession.openedAt &&
        existingControl.extensionUntil <= now
          ? existingControl.extensionUntil
          : null
      const regularClose = getRegularCloseForOperationDate(
        getSeoulOperationDate(activeSession.openedAt),
      )
      const closedAt = previousStatus.isOpen
        ? now
        : (expiredExtension ?? (regularClose <= now ? regularClose : now))

      await tx
        .update(operationSessions)
        .set({
          closedAt,
          closedBy: previousStatus.isOpen ? profile.authUserId : null,
          updatedAt: now,
        })
        .where(eq(operationSessions.id, activeSession.id))
    } else if (previousStatus.isOpen) {
      const openedAt =
        previousStatus.mode === 'regular'
          ? regularWindow.opensAt
          : (existingControl?.updatedAt ?? now)

      await tx.insert(operationSessions).values({
        id: createOperationSessionId(openedAt),
        operationDate: getSeoulOperationDate(openedAt),
        openedAt,
        closedAt: now,
        closedBy: profile.authUserId,
        createdAt: now,
        updatedAt: now,
      })
    }

    await writeApplicationLog(tx, {
      level: 'info',
      category: 'operation',
      event: 'operation.closed',
      message: '관리자가 작업 운영을 종료했습니다.',
      actorUserId: profile.authUserId,
      metadata: { wasOpen: previousStatus.isOpen },
      createdAt: now,
    })

    return updatedControl
  })

  return resolveOperationStatus(control, now)
})
