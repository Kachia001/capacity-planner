import { asc, eq } from 'drizzle-orm'
import { bays } from '../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event)
  const db = useDb()

  return await db
    .select({
      id: bays.id,
      code: bays.code,
      description: bays.description,
    })
    .from(bays)
    .where(eq(bays.status, 'active'))
    .orderBy(asc(bays.code))
})
