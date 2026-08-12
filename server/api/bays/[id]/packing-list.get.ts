import { asc, eq, inArray } from 'drizzle-orm'
import {
  bayPackingListRows,
  bayPackingListSections,
  bayPackingLists,
  bays,
} from '../../../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event)
  const bayId = getRouterParam(event, 'id')
  if (!bayId) throw createError({ statusCode: 400, message: 'Bay ID가 필요합니다.' })

  const db = useDb()
  const [packingList] = await db
    .select({
      id: bayPackingLists.id,
      bayId: bayPackingLists.bayId,
      bayCode: bays.code,
      memo: bayPackingLists.memo,
      version: bayPackingLists.version,
    })
    .from(bayPackingLists)
    .innerJoin(bays, eq(bayPackingLists.bayId, bays.id))
    .where(eq(bayPackingLists.bayId, bayId))
    .limit(1)

  if (!packingList) return null

  const sections = await db
    .select()
    .from(bayPackingListSections)
    .where(eq(bayPackingListSections.packingListId, packingList.id))
    .orderBy(asc(bayPackingListSections.sortOrder))
  const rows = sections.length
    ? await db
        .select()
        .from(bayPackingListRows)
        .where(
          inArray(
            bayPackingListRows.sectionId,
            sections.map(section => section.id),
          ),
        )
        .orderBy(asc(bayPackingListRows.sectionId), asc(bayPackingListRows.sortOrder))
    : []
  const totalRows = rows.length
  const checkedRows = rows.filter(row => row.isChecked).length

  return {
    ...packingList,
    memo: packingList.memo ?? '',
    totalRows,
    checkedRows,
    progress: calculatePackingProgress(checkedRows, totalRows),
    sections: sections.map(section => ({
      clientId: `packing-section-${section.id}`,
      sortOrder: section.sortOrder,
      name: section.name,
      memo: section.memo ?? '',
      rows: rows
        .filter(row => row.sectionId === section.id)
        .map(row => ({
          clientId: `packing-row-${row.id}`,
          sortOrder: row.sortOrder,
          label: row.label,
          isChecked: row.isChecked,
          memo: row.memo ?? '',
        })),
    })),
  }
})
