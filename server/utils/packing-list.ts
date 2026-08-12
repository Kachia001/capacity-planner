import { z } from 'zod'

const packingRowSchema = z.object({
  sortOrder: z.number().int().positive(),
  label: z.string().trim().min(1).max(500),
  isChecked: z.boolean().default(false),
  memo: z.string().trim().max(2000).default(''),
})

export const packingSectionSchema = z.object({
  sortOrder: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  memo: z.string().trim().max(2000).default(''),
  rows: z.array(packingRowSchema),
})

export const packingSectionsSchema = z.array(packingSectionSchema).superRefine((sections, ctx) => {
  sections.forEach((section, sectionIndex) => {
    if (section.sortOrder !== sectionIndex + 1) {
      ctx.addIssue({
        code: 'custom',
        path: [sectionIndex, 'sortOrder'],
        message: 'Section order must be sequential.',
      })
    }
    section.rows.forEach((row, rowIndex) => {
      if (row.sortOrder !== rowIndex + 1) {
        ctx.addIssue({
          code: 'custom',
          path: [sectionIndex, 'rows', rowIndex, 'sortOrder'],
          message: 'Row order must be sequential.',
        })
      }
    })
  })
})

export function calculatePackingProgress(checkedRows: number, totalRows: number) {
  return totalRows > 0 ? Math.round((checkedRows / totalRows) * 100) : 0
}
