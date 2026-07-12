import { z } from 'zod'
import { bays, workItems } from '../db/schema'

const nullableText = z.string().trim().max(1000)
const itemSchema = z.object({
  sortOrder: z.number().int().positive(),
  legacySourceRow: z.number().int().positive().nullable(),
  workDetail: nullableText,
  vendor: nullableText,
  partNo: nullableText,
  itemName: nullableText,
  bolt: nullableText,
})
const groupSchema = z.object({
  sortOrder: z.number().int().positive(),
  kind: z.enum(['work', 'material']),
  workNo: z.number().int().nonnegative().nullable(),
  workName: z.string().trim().max(300),
  items: z.array(itemSchema).min(1),
})
const createBaySchema = z.object({
  bay: z.object({
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,40}$/),
    description: z.string().trim().max(300),
  }),
  groups: z.array(groupSchema).min(1),
}).superRefine(({ groups }, ctx) => {
  groups.forEach((group, groupIndex) => {
    if (group.sortOrder !== groupIndex + 1) {
      ctx.addIssue({ code: 'custom', path: ['groups', groupIndex, 'sortOrder'], message: 'Group order must be sequential.' })
    }
    if (group.kind === 'work' && !group.workName) {
      ctx.addIssue({ code: 'custom', path: ['groups', groupIndex, 'workName'], message: 'Work groups require a name.' })
    }
    group.items.forEach((item, itemIndex) => {
      if (item.sortOrder !== itemIndex + 1) {
        ctx.addIssue({ code: 'custom', path: ['groups', groupIndex, 'items', itemIndex, 'sortOrder'], message: 'Item order must be sequential.' })
      }
      if (!item.legacySourceRow && ![item.workDetail, item.vendor, item.partNo, item.itemName, item.bolt].some(Boolean)) {
        ctx.addIssue({ code: 'custom', path: ['groups', groupIndex, 'items', itemIndex], message: 'Empty work items are not allowed.' })
      }
    })
  })
})

export default defineEventHandler(async (event) => {
  await requireAppUser(event, ['admin'])
  const body = createBaySchema.parse(await readBody(event))
  const db = useDb()

  try {
    return await db.transaction(async (tx) => {
      const [bay] = await tx.insert(bays).values({
        code: body.bay.code,
        description: body.bay.description || null,
      }).returning()

      const rows = body.groups.flatMap(group => group.items.map(item => ({ group, item })))
      await tx.insert(workItems).values(rows.map(({ group, item }, index) => ({
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
      })))

      return { id: bay!.id, code: bay!.code, workItemCount: rows.length }
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: '이미 존재하는 BAY 코드입니다.' })
    }
    throw error
  }
})
