import { z } from 'zod'
import { operationControl } from '../../db/schema'
import { getRegularWindow, resolveOperationStatus } from '../../utils/operation-policy'

const openOperationSchema = z.object({
  extensionMinutes: z.number().int().min(1).max(1440).optional(),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const body = openOperationSchema.parse((await readBody(event)) ?? {})
  const now = new Date()
  const regularWindow = getRegularWindow(now)

  if (!regularWindow.isWithinRegularHours && body.extensionMinutes === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: '정규 운영시간 외 Open에는 1분~24시간의 연장 시간이 필요합니다.',
    })
  }

  const extensionUntil =
    regularWindow.isWithinRegularHours || body.extensionMinutes === undefined
      ? null
      : new Date(now.getTime() + body.extensionMinutes * 60 * 1000)
  const db = useDb()
  const [control] = await db
    .insert(operationControl)
    .values({
      id: 1,
      manualClosedUntil: null,
      extensionUntil,
      updatedBy: profile.authUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: operationControl.id,
      set: {
        manualClosedUntil: null,
        extensionUntil,
        updatedBy: profile.authUserId,
        updatedAt: now,
      },
    })
    .returning()

  return resolveOperationStatus(control, now)
})
