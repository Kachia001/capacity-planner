import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { bays, workTables } from '../../../db/schema'

const tableNumberSchema = z.coerce.number().int().min(1).max(18)
const bodySchema = z.object({ bayId: z.string().uuid().nullable() })

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const tableNumber = tableNumberSchema.parse(getRouterParam(event, 'number'))
  const { bayId } = bodySchema.parse(await readBody(event))
  const db = useDb()

  try {
    return await db.transaction(async tx => {
      const [table] = await tx
        .select({ number: workTables.number })
        .from(workTables)
        .where(and(eq(workTables.number, tableNumber), eq(workTables.isActive, true)))
        .limit(1)

      if (!table) {
        throw createError({ statusCode: 404, message: '테이블을 찾을 수 없습니다.' })
      }

      if (bayId === null) {
        await tx
          .update(bays)
          .set({ tableNumber: null, updatedAt: new Date() })
          .where(eq(bays.tableNumber, tableNumber))
        return { tableNumber, bayId: null }
      }

      const [bay] = await tx
        .select({ id: bays.id })
        .from(bays)
        .where(and(eq(bays.id, bayId), eq(bays.status, 'active')))
        .limit(1)

      if (!bay) {
        throw createError({ statusCode: 404, message: 'BAY를 찾을 수 없습니다.' })
      }

      await tx
        .update(bays)
        .set({ tableNumber: null, updatedAt: new Date() })
        .where(eq(bays.tableNumber, tableNumber))

      await tx
        .update(bays)
        .set({ tableNumber, updatedAt: new Date() })
        .where(eq(bays.id, bayId))

      return { tableNumber, bayId }
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      throw createError({
        statusCode: 409,
        message: '선택한 테이블에는 이미 다른 BAY가 할당되어 있습니다.',
      })
    }
    throw error
  }
})
