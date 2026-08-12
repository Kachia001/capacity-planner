import { z } from 'zod'
import {
  packingListTemplateRows,
  packingListTemplateSections,
  packingListTemplates,
} from '../db/schema'

const createPackingTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300),
  sections: packingSectionsSchema.min(1),
})

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
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

    return { id: template!.id, name: template!.name }
  })
})
