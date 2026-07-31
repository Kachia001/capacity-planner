import { z } from 'zod'

export const WorkItemStatusSchema = z.enum(['not_started', 'in_progress', 'completed'])
export const WorkItemRestoreTargetSchema = z.enum(['not_started', 'in_progress'])
export const WorkItemIssueCategorySchema = z.enum([
  'material_shortage',
  'work_delay',
  'quality_issue',
  'other',
])
export const WorkItemIssueStatusSchema = z.enum(['unconfirmed', 'in_review', 'resolved'])

export const WorkItemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>
export type WorkItemRestoreTarget = z.infer<typeof WorkItemRestoreTargetSchema>
export type WorkItemIssueCategory = z.infer<typeof WorkItemIssueCategorySchema>
export type WorkItemIssueStatus = z.infer<typeof WorkItemIssueStatusSchema>
export type WorkItemIdParams = z.infer<typeof WorkItemIdParamsSchema>
