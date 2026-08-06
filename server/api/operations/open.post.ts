import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { operationControl } from '../../db/schema'
import {
  calculateExtensionUntil,
  getRegularWindow,
  resolveOperationStatus,
} from '../../utils/operation-policy'

const openOperationSchema = z.object({
  extensionMinutes: z.number().int().min(1).max(1440).optional(),
  extensionUntil: z.string().datetime({ offset: true }).optional(),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const parsedBody = openOperationSchema.safeParse((await readBody(event)) ?? {})
  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      message: '작업 연장 설정이 올바르지 않습니다.',
    })
  }

  const body = parsedBody.data
  const now = new Date()
  const regularWindow = getRegularWindow(now)

  if (body.extensionMinutes !== undefined && body.extensionUntil !== undefined) {
    throw createError({
      statusCode: 400,
      message: '연장 시간과 종료 시각 중 하나만 선택할 수 있습니다.',
    })
  }

  if (
    !regularWindow.isWithinRegularHours &&
    body.extensionMinutes === undefined &&
    body.extensionUntil === undefined
  ) {
    throw createError({
      statusCode: 400,
      message: '정규 운영시간 외 Open에는 연장 시간 또는 종료 시각이 필요합니다.',
    })
  }

  const db = useDb()
  const control = await db.transaction(async tx => {
    const [existingControl] = await tx
      .select()
      .from(operationControl)
      .where(eq(operationControl.id, 1))
      .limit(1)
      .for('update')

    let extensionUntil: Date | null = null

    if (!regularWindow.isWithinRegularHours) {
      const activeExtensionUntil =
        existingControl?.extensionUntil && existingControl.extensionUntil.getTime() > now.getTime()
          ? existingControl.extensionUntil
          : null

      extensionUntil =
        body.extensionUntil !== undefined
          ? new Date(body.extensionUntil)
          : calculateExtensionUntil(now, activeExtensionUntil, body.extensionMinutes!)

      if (extensionUntil.getTime() <= now.getTime()) {
        throw createError({
          statusCode: 400,
          message: '종료 시각은 현재보다 이후여야 합니다.',
        })
      }

      if (
        activeExtensionUntil &&
        body.extensionUntil !== undefined &&
        extensionUntil.getTime() <= activeExtensionUntil.getTime()
      ) {
        throw createError({
          statusCode: 400,
          message: '종료 시각은 현재 연장 종료 시각보다 이후여야 합니다.',
        })
      }

      if (extensionUntil.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
        throw createError({
          statusCode: 400,
          message: '종료 시각은 현재부터 24시간 이내여야 합니다.',
        })
      }
    }

    const [updatedControl] = await tx
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

    return updatedControl
  })

  return resolveOperationStatus(control, now)
})
