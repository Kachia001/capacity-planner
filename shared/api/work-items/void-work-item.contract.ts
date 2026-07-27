import { z } from 'zod'
import { WorkItemStatusSchema } from './work-item.contract'

export const VoidWorkItemRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const VoidWorkItemResponseSchema = z.object({
  id: z.number().int().positive(),
  status: WorkItemStatusSchema,
  voidedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
})

export type VoidWorkItemRequest = z.infer<typeof VoidWorkItemRequestSchema>
export type VoidWorkItemResponse = z.infer<typeof VoidWorkItemResponseSchema>
