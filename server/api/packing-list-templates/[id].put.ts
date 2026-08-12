import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  packingListTemplateRows,
  packingListTemplateSections,
  packingListTemplates,
} from '../../db/schema'

const updatePackingTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300),
  revision: z.number().int().positive(),
  sections: packingSectionsSchema.min(1),
})

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const templateId = getRouterParam(event, 'id')
  if (!templateId) throw createError({ statusCode: 400, message: '템플릿 ID가 필요합니다.' })
  const body = updatePackingTemplateSchema.parse(await readBody(event))
  const db = useDb()

  return await db.transaction(async tx => {
    const [template] = await tx
      .update(packingListTemplates)
      .set({
        name: body.name,
        description: body.description || null,
        revision: sql`${packingListTemplates.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(packingListTemplates.id, templateId),
          eq(packingListTemplates.revision, body.revision),
          eq(packingListTemplates.isArchived, false),
        ),
      )
      .returning()

    if (!template) {
      throw createError({
        statusCode: 409,
        message: '템플릿이 변경되었거나 보관되었습니다. 목록을 새로고침해 주세요.',
      })
    }

    await tx
      .delete(packingListTemplateSections)
      .where(eq(packingListTemplateSections.templateId, templateId))
    const savedSections = await tx
      .insert(packingListTemplateSections)
      .values(
        body.sections.map(section => ({
          templateId,
          sortOrder: section.sortOrder,
          name: section.name,
        })),
      )
      .returning()
    const sectionIds = new Map(savedSections.map(section => [section.sortOrder, section.id]))
    const rows = body.sections.flatMap(section =>
      section.rows.map(row => ({
        sectionId: sectionIds.get(section.sortOrder)!,
        sortOrder: row.sortOrder,
        label: row.label,
      })),
    )
    if (rows.length) await tx.insert(packingListTemplateRows).values(rows)

    return { id: template.id, name: template.name, revision: template.revision }
  })
})
