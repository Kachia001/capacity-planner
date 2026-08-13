import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  bayPackingListRows,
  bayPackingListSections,
  bayPackingLists,
  bays,
} from '../../../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

const updatePackingListSchema = z.object({
  memo: z.string().trim().max(10000),
  version: z.number().int().nonnegative(),
  sections: packingSectionsSchema,
})

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const bayId = getRouterParam(event, 'id')
  if (!bayId) throw createError({ statusCode: 400, message: 'Bay ID가 필요합니다.' })
  const body = updatePackingListSchema.parse(await readBody(event))
  const db = useDb()

  const saved = await db.transaction(async tx => {
    const [packingList] = await tx
      .update(bayPackingLists)
      .set({
        memo: body.memo || null,
        version: sql`${bayPackingLists.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(bayPackingLists.bayId, bayId), eq(bayPackingLists.version, body.version)))
      .returning({ id: bayPackingLists.id })

    if (!packingList) {
      throw createError({
        statusCode: 409,
        message: '다른 사용자가 패킹리스트를 수정했습니다. 새로고침 후 다시 시도해 주세요.',
      })
    }

    await tx
      .delete(bayPackingListSections)
      .where(eq(bayPackingListSections.packingListId, packingList.id))

    if (body.sections.length) {
      const savedSections = await tx
        .insert(bayPackingListSections)
        .values(
          body.sections.map(section => ({
            packingListId: packingList.id,
            sortOrder: section.sortOrder,
            name: section.name,
            memo: section.memo || null,
          })),
        )
        .returning()
      const sectionIds = new Map(savedSections.map(section => [section.sortOrder, section.id]))
      const rows = body.sections.flatMap(section =>
        section.rows.map(row => ({
          sectionId: sectionIds.get(section.sortOrder)!,
          sortOrder: row.sortOrder,
          label: row.label,
          isChecked: row.isChecked,
          memo: row.memo || null,
        })),
      )
      if (rows.length) await tx.insert(bayPackingListRows).values(rows)
    }

    await writeApplicationLog(tx, {
      level: 'info',
      category: 'packing-list',
      event: 'packing-list.updated',
      message: '관리자가 BAY 패킹리스트를 수정했습니다.',
      actorUserId: profile.authUserId,
      metadata: { bayId, packingListId: packingList.id, revision: body.version + 1 },
    })

    return packingList
  })

  const [bay] = await db.select({ code: bays.code }).from(bays).where(eq(bays.id, bayId)).limit(1)
  const totalRows = body.sections.reduce((sum, section) => sum + section.rows.length, 0)
  const checkedRows = body.sections.reduce(
    (sum, section) => sum + section.rows.filter(row => row.isChecked).length,
    0,
  )

  return {
    id: saved.id,
    bayId,
    bayCode: bay?.code ?? '',
    memo: body.memo,
    version: body.version + 1,
    totalRows,
    checkedRows,
    progress: calculatePackingProgress(checkedRows, totalRows),
    sections: body.sections.map((section, sectionIndex) => ({
      ...section,
      clientId: `packing-section-${sectionIndex + 1}`,
      rows: section.rows.map((row, rowIndex) => ({
        ...row,
        clientId: `packing-row-${sectionIndex + 1}-${rowIndex + 1}`,
      })),
    })),
  }
})
