import { asc, eq, inArray } from 'drizzle-orm'
import {
  packingListTemplateRows,
  packingListTemplateSections,
  packingListTemplates,
} from '../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const db = useDb()

  const templates = await db
    .select()
    .from(packingListTemplates)
    .where(eq(packingListTemplates.isArchived, false))
    .orderBy(asc(packingListTemplates.name))

  if (templates.length === 0) return []

  const sections = await db
    .select()
    .from(packingListTemplateSections)
    .where(
      inArray(
        packingListTemplateSections.templateId,
        templates.map(template => template.id),
      ),
    )
    .orderBy(
      asc(packingListTemplateSections.templateId),
      asc(packingListTemplateSections.sortOrder),
    )

  const rows = sections.length
    ? await db
        .select()
        .from(packingListTemplateRows)
        .where(
          inArray(
            packingListTemplateRows.sectionId,
            sections.map(section => section.id),
          ),
        )
        .orderBy(asc(packingListTemplateRows.sectionId), asc(packingListTemplateRows.sortOrder))
    : []

  return templates.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description ?? '',
    revision: template.revision,
    updatedAt: template.updatedAt,
    sections: sections
      .filter(section => section.templateId === template.id)
      .map(section => ({
        clientId: `template-section-${section.id}`,
        sortOrder: section.sortOrder,
        name: section.name,
        memo: '',
        rows: rows
          .filter(row => row.sectionId === section.id)
          .map(row => ({
            clientId: `template-row-${row.id}`,
            sortOrder: row.sortOrder,
            label: row.label,
            isChecked: false,
            memo: '',
          })),
      })),
  }))
})
