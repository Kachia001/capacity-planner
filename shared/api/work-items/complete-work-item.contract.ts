import { z } from 'zod'
import { WorkItemStatusSchema } from './work-item.contract'

export const CompleteWorkItemResponseSchema = z.object({
  id: z.number().int().positive(),
  status: WorkItemStatusSchema,
  completedBy: z.string().uuid(),
  completedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
})

export type CompleteWorkItemResponse = z.infer<typeof CompleteWorkItemResponseSchema>
