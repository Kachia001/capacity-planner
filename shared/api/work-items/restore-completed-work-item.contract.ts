import { z } from 'zod'
import { WorkItemRestoreTargetSchema, WorkItemStatusSchema } from './work-item.contract'

export const RestoreCompletedWorkItemRequestSchema = z.object({
  targetStatus: WorkItemRestoreTargetSchema,
  reason: z.string().trim().min(3).max(500),
})

export const RestoreCompletedWorkItemResponseSchema = z.object({
  id: z.number().int().positive(),
  status: WorkItemStatusSchema,
  startedBy: z.string().uuid().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedBy: z.string().uuid().nullable(),
  completedAt: z.string().datetime().nullable(),
  version: z.number().int().nonnegative(),
})

export type RestoreCompletedWorkItemRequest = z.infer<typeof RestoreCompletedWorkItemRequestSchema>
export type RestoreCompletedWorkItemResponse = z.infer<
  typeof RestoreCompletedWorkItemResponseSchema
>
