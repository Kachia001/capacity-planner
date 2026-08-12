import { and, eq } from 'drizzle-orm'
import { packingListTemplates } from '../../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const templateId = getRouterParam(event, 'id')
  if (!templateId) throw createError({ statusCode: 400, message: '템플릿 ID가 필요합니다.' })
  const db = useDb()

  const [template] = await db
    .update(packingListTemplates)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(packingListTemplates.id, templateId), eq(packingListTemplates.isArchived, false)))
    .returning({ id: packingListTemplates.id, name: packingListTemplates.name })

  if (!template) throw createError({ statusCode: 404, message: '템플릿을 찾을 수 없습니다.' })
  return template
})
