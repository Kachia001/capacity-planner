import { z } from 'zod'
import {
  bayPackingListRows,
  bayPackingListSections,
  bayPackingLists,
  bays,
  workItems,
} from '../db/schema'
import { writeApplicationLog } from '#server/utils/application-log'

const nullableText = z.string().trim().max(1000)
const itemSchema = z.object({
  sortOrder: z.number().int().positive(),
  legacySourceRow: z.number().int().positive().nullable(),
  workDetail: nullableText,
  vendor: nullableText,
  partNo: nullableText,
  itemName: nullableText,
  bolt: nullableText,
  isHighAltitude: z.boolean(),
  safetyNote: nullableText,
})
const groupSchema = z.object({
  sortOrder: z.number().int().positive(),
  kind: z.enum(['work', 'material']),
  workNo: z.number().int().nonnegative().nullable(),
  workName: z.string().trim().max(300),
  items: z.array(itemSchema).min(1),
})
const createBaySchema = z
  .object({
    bay: z.object({
      code: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_-]{2,40}$/),
      description: z.string().trim().max(300),
      tableNumber: z.number().int().min(1).max(18),
    }),
    groups: z.array(groupSchema).min(1),
    packingList: z
      .object({
        memo: z.string().trim().max(10000).default(''),
        sections: packingSectionsSchema,
      })
      .nullable()
      .default(null),
  })
  .superRefine(({ groups }, ctx) => {
    groups.forEach((group, groupIndex) => {
      if (group.sortOrder !== groupIndex + 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['groups', groupIndex, 'sortOrder'],
          message: 'Group order must be sequential.',
        })
      }
      if (group.kind === 'work' && !group.workName) {
        ctx.addIssue({
          code: 'custom',
          path: ['groups', groupIndex, 'workName'],
          message: 'Work groups require a name.',
        })
      }
      group.items.forEach((item, itemIndex) => {
        if (item.sortOrder !== itemIndex + 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['groups', groupIndex, 'items', itemIndex, 'sortOrder'],
            message: 'Item order must be sequential.',
          })
        }
        if (
          !item.legacySourceRow &&
          ![item.workDetail, item.vendor, item.partNo, item.itemName, item.bolt].some(Boolean)
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['groups', groupIndex, 'items', itemIndex],
            message: 'Empty work items are not allowed.',
          })
        }
      })
    })
  })

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const body = createBaySchema.parse(await readBody(event))
  const db = useDb()

  try {
    return await db.transaction(async tx => {
      const [bay] = await tx
        .insert(bays)
        .values({
          code: body.bay.code,
          description: body.bay.description || null,
          tableNumber: body.bay.tableNumber,
        })
        .returning()

      const rows = body.groups.flatMap(group => group.items.map(item => ({ group, item })))
      await tx.insert(workItems).values(
        rows.map(({ group, item }, index) => ({
          bayId: bay!.id,
          sortOrder: index + 1,
          sourceRow: item.legacySourceRow,
          workNo: group.workNo,
          workName: group.workName || null,
          workDetail: item.workDetail || null,
          vendor: item.vendor || null,
          partNo: item.partNo || null,
          itemName: item.itemName || null,
          bolt: item.bolt || null,
          isHighAltitude: item.isHighAltitude,
          safetyNote: item.safetyNote || null,
        })),
      )

      if (body.packingList) {
        const [packingList] = await tx
          .insert(bayPackingLists)
          .values({ bayId: bay!.id, memo: body.packingList.memo || null })
          .returning()
        if (body.packingList.sections.length) {
          const sections = await tx
            .insert(bayPackingListSections)
            .values(
              body.packingList.sections.map(section => ({
                packingListId: packingList!.id,
                sortOrder: section.sortOrder,
                name: section.name,
                memo: section.memo || null,
              })),
            )
            .returning()
          const sectionIds = new Map(sections.map(section => [section.sortOrder, section.id]))
          const packingRows = body.packingList.sections.flatMap(section =>
            section.rows.map(row => ({
              sectionId: sectionIds.get(section.sortOrder)!,
              sortOrder: row.sortOrder,
              label: row.label,
              isChecked: false,
              memo: null,
            })),
          )
          if (packingRows.length) await tx.insert(bayPackingListRows).values(packingRows)
        }
      }

      await writeApplicationLog(tx, {
        level: 'info',
        category: 'bay',
        event: 'bay.created',
        message: '관리자가 BAY를 생성했습니다.',
        actorUserId: profile.authUserId,
        metadata: {
          bayId: bay!.id,
          tableNumber: body.bay.tableNumber,
          workItemCount: rows.length,
          hasPackingList: Boolean(body.packingList),
        },
      })

      return {
        id: bay!.id,
        code: bay!.code,
        workItemCount: rows.length,
        hasPackingList: Boolean(body.packingList),
      }
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      const constraint = 'constraint' in error ? String(error.constraint) : ''
      throw createError({
        statusCode: 409,
        message: constraint.includes('table_number')
          ? '선택한 테이블에는 이미 BAY가 할당되어 있습니다.'
          : '이미 존재하는 BAY 코드입니다.',
      })
    }
    throw error
  }
})
