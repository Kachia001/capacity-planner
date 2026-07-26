import { operationControl } from '../../db/schema'
import { getRegularWindow, resolveOperationStatus } from '../../utils/operation-policy'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const now = new Date()
  const regularWindow = getRegularWindow(now)
  const manualClosedUntil = regularWindow.isWithinRegularHours ? regularWindow.closesAt : null
  const db = useDb()
  const [control] = await db
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

  return resolveOperationStatus(control, now)
})
