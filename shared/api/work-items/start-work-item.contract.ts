import { z } from 'zod'
import { WorkItemStatusSchema } from './work-item.contract'

export const StartWorkItemResponseSchema = z.object({
  id: z.number().int().positive(),
  status: WorkItemStatusSchema,
  startedBy: z.string().uuid(),
  startedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
})

export type StartWorkItemResponse = z.infer<typeof StartWorkItemResponseSchema>
