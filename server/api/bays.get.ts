import { asc, eq, sql } from 'drizzle-orm'
import { bayPackingListRows, bayPackingListSections, bayPackingLists, bays } from '../db/schema'

export default defineEventHandler(async event => {
  await requireAppUser(event)
  const db = useDb()

  const [bayRows, packingRows] = await Promise.all([
    db
      .select({
        id: bays.id,
        code: bays.code,
        description: bays.description,
        tableNumber: bays.tableNumber,
      })
      .from(bays)
      .where(eq(bays.status, 'active'))
      .orderBy(asc(bays.code)),
    db
      .select({
        bayId: bayPackingLists.bayId,
        totalRows: sql<number>`count(${bayPackingListRows.id})::int`,
        checkedRows: sql<number>`count(${bayPackingListRows.id}) filter (
          where ${bayPackingListRows.isChecked} = true
        )::int`,
      })
      .from(bayPackingLists)
      .leftJoin(
        bayPackingListSections,
        eq(bayPackingListSections.packingListId, bayPackingLists.id),
      )
      .leftJoin(bayPackingListRows, eq(bayPackingListRows.sectionId, bayPackingListSections.id))
      .groupBy(bayPackingLists.bayId),
  ])
  const packingByBay = new Map(packingRows.map(row => [row.bayId, row]))

  return bayRows.map(bay => {
    const packing = packingByBay.get(bay.id)
    return {
      ...bay,
      hasPackingList: Boolean(packing),
      packingProgress: packing
        ? calculatePackingProgress(packing.checkedRows, packing.totalRows)
        : null,
    }
  })
})
