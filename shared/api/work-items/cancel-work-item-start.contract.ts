import { z } from 'zod'
import { WorkItemStatusSchema } from './work-item.contract'

export const CancelWorkItemStartRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const CancelWorkItemStartResponseSchema = z.object({
  id: z.number().int().positive(),
  status: WorkItemStatusSchema,
  version: z.number().int().nonnegative(),
})

export type CancelWorkItemStartRequest = z.infer<typeof CancelWorkItemStartRequestSchema>
export type CancelWorkItemStartResponse = z.infer<typeof CancelWorkItemStartResponseSchema>
