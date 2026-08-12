import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  bayPackingListRows,
  bayPackingListSections,
  bayPackingLists,
  bays,
} from '../../../db/schema'

const assignPackingListSchema = z.object({
  sections: packingSectionsSchema,
})

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin', 'manager'])
  const bayId = getRouterParam(event, 'id')
  if (!bayId) throw createError({ statusCode: 400, message: 'Bay ID가 필요합니다.' })
  const body = assignPackingListSchema.parse(await readBody(event))
  const db = useDb()

  try {
    const result = await db.transaction(async tx => {
      const [bay] = await tx
        .select({ id: bays.id, code: bays.code })
        .from(bays)
        .where(eq(bays.id, bayId))
        .limit(1)
      if (!bay) throw createError({ statusCode: 404, message: 'Bay를 찾을 수 없습니다.' })

      const [existing] = await tx
        .select({ id: bayPackingLists.id })
        .from(bayPackingLists)
        .where(eq(bayPackingLists.bayId, bayId))
        .limit(1)
      if (existing) {
        throw createError({ statusCode: 409, message: '이미 패킹리스트가 할당된 Bay입니다.' })
      }

      const [packingList] = await tx.insert(bayPackingLists).values({ bayId }).returning()
      const savedSections = body.sections.length
        ? await tx
            .insert(bayPackingListSections)
            .values(
              body.sections.map(section => ({
                packingListId: packingList!.id,
                sortOrder: section.sortOrder,
                name: section.name,
              })),
            )
            .returning()
        : []
      const sectionIds = new Map(savedSections.map(section => [section.sortOrder, section.id]))
      const rows = body.sections.flatMap(section =>
        section.rows.map(row => ({
          sectionId: sectionIds.get(section.sortOrder)!,
          sortOrder: row.sortOrder,
          label: row.label,
          isChecked: false,
        })),
      )
      if (rows.length) await tx.insert(bayPackingListRows).values(rows)

      return { bay, packingList: packingList! }
    })

    const totalRows = body.sections.reduce((sum, section) => sum + section.rows.length, 0)
    return {
      id: result.packingList.id,
      bayId,
      bayCode: result.bay.code,
      memo: '',
      version: 0,
      totalRows,
      checkedRows: 0,
      progress: 0,
      sections: body.sections.map((section, sectionIndex) => ({
        ...section,
        clientId: `packing-section-${sectionIndex + 1}`,
        memo: '',
        rows: section.rows.map((row, rowIndex) => ({
          ...row,
          clientId: `packing-row-${sectionIndex + 1}-${rowIndex + 1}`,
          isChecked: false,
          memo: '',
        })),
      })),
    }
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      throw createError({ statusCode: 409, message: '이미 패킹리스트가 할당된 Bay입니다.' })
    }
    throw error
  }
})
