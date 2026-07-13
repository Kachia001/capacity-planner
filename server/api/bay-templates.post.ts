import { z } from 'zod'
import { bayTemplateRows, bayTemplates } from '../db/schema'

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
const createTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(300),
    groups: z.array(groupSchema).min(1),
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
  await requireAppUser(event, ['admin'])
  const body = createTemplateSchema.parse(await readBody(event))
  const db = useDb()

  return await db.transaction(async tx => {
    const [template] = await tx
      .insert(bayTemplates)
      .values({
        name: body.name,
        description: body.description || null,
      })
      .returning()

    const rows = body.groups.flatMap(group => group.items.map(item => ({ group, item })))
    const savedRows = await tx
      .insert(bayTemplateRows)
      .values(
        rows.map(({ group, item }, index) => ({
          templateId: template!.id,
          sortOrder: index + 1,
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
      .returning()

    return {
      id: template!.id,
      name: template!.name,
      description: template!.description ?? '',
      updatedAt: template!.updatedAt,
      rows: savedRows,
    }
  })
})
