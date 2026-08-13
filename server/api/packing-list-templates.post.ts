import { z } from 'zod'
import {
  packingListTemplateRows,
  packingListTemplateSections,
  packingListTemplates,
} from '../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

const createPackingTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300),
  sections: packingSectionsSchema.min(1),
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const body = createPackingTemplateSchema.parse(await readBody(event))
  const db = useDb()

  return await db.transaction(async tx => {
    const [template] = await tx
      .insert(packingListTemplates)
      .values({ name: body.name, description: body.description || null })
      .returning()

    const savedSections = await tx
      .insert(packingListTemplateSections)
      .values(
        body.sections.map(section => ({
          templateId: template!.id,
          sortOrder: section.sortOrder,
          name: section.name,
        })),
      )
      .returning()

    const sectionIds = new Map(savedSections.map(section => [section.sortOrder, section.id]))
    const rowValues = body.sections.flatMap(section =>
      section.rows.map(row => ({
        sectionId: sectionIds.get(section.sortOrder)!,
        sortOrder: row.sortOrder,
        label: row.label,
      })),
    )
    if (rowValues.length) await tx.insert(packingListTemplateRows).values(rowValues)
    await writeApplicationLog(tx, {
      level: 'info',
      category: 'template',
      event: 'packing-template.created',
      message: '관리자가 패킹리스트 템플릿을 생성했습니다.',
      actorUserId: profile.authUserId,
      metadata: {
        templateId: template!.id,
        sectionCount: savedSections.length,
        rowCount: rowValues.length,
      },
    })

    return { id: template!.id, name: template!.name }
  })
})
