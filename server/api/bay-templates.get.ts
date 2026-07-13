import { asc, eq } from 'drizzle-orm'
import { bayTemplateRows, bayTemplates } from '../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  const db = useDb()

  const templates = await db
    .select()
    .from(bayTemplates)
    .where(eq(bayTemplates.isArchived, false))
    .orderBy(asc(bayTemplates.name))
  const rows = await db
    .select()
    .from(bayTemplateRows)
    .orderBy(asc(bayTemplateRows.templateId), asc(bayTemplateRows.sortOrder))

  return templates.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description ?? '',
    updatedAt: template.updatedAt,
    rows: rows
      .filter(row => row.templateId === template.id)
      .map(row => ({
        sortOrder: row.sortOrder,
        workNo: row.workNo,
        workName: row.workName,
        workDetail: row.workDetail,
        vendor: row.vendor,
        partNo: row.partNo,
        itemName: row.itemName,
        bolt: row.bolt,
        isHighAltitude: row.isHighAltitude,
        safetyNote: row.safetyNote,
      })),
  }))
})
