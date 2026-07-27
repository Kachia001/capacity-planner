import { z } from 'zod'

export const WorkItemStatusSchema = z.enum(['not_started', 'in_progress', 'completed'])
export const WorkItemRestoreTargetSchema = z.enum(['not_started', 'in_progress'])
export const IssueSeveritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export const WorkItemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>
export type WorkItemRestoreTarget = z.infer<typeof WorkItemRestoreTargetSchema>
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>
export type WorkItemIdParams = z.infer<typeof WorkItemIdParamsSchema>
