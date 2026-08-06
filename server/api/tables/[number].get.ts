import { z } from 'zod'
import { getWorkTableOverview } from '../../utils/work-tables'

const tableNumberSchema = z.coerce.number().int().min(1).max(18)

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const tableNumber = tableNumberSchema.parse(getRouterParam(event, 'number'))
  const table = (await getWorkTableOverview(useDb())).find(item => item.number === tableNumber)

  if (!table) {
    throw createError({ statusCode: 404, message: '테이블을 찾을 수 없습니다.' })
  }

  return table
})

