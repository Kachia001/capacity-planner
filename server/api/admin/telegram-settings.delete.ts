import { eq } from 'drizzle-orm'
import { telegramSettings } from '#server/db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  await useDb().delete(telegramSettings).where(eq(telegramSettings.id, 1))

  return { deleted: true }
})
