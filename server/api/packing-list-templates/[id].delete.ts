import { and, eq } from 'drizzle-orm'
import { packingListTemplates } from '../../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const templateId = getRouterParam(event, 'id')
  if (!templateId) throw createError({ statusCode: 400, message: '템플릿 ID가 필요합니다.' })
  const db = useDb()

  const template = await db.transaction(async tx => {
    const [archived] = await tx
      .update(packingListTemplates)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(
        and(eq(packingListTemplates.id, templateId), eq(packingListTemplates.isArchived, false)),
      )
      .returning({ id: packingListTemplates.id, name: packingListTemplates.name })
    if (archived) {
      await writeApplicationLog(tx, {
        level: 'info',
        category: 'template',
        event: 'packing-template.archived',
        message: '관리자가 패킹리스트 템플릿을 보관 처리했습니다.',
        actorUserId: profile.authUserId,
        metadata: { templateId },
      })
    }
    return archived
  })

  if (!template) throw createError({ statusCode: 404, message: '템플릿을 찾을 수 없습니다.' })
  return template
})
