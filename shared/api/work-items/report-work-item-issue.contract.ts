import { z } from 'zod'
import { WorkItemIssueCategorySchema, WorkItemIssueStatusSchema } from './work-item.contract'

export const ReportWorkItemIssueRequestSchema = z.object({
  category: WorkItemIssueCategorySchema,
  note: z.string().trim().min(3).max(1000),
})

export const ReportWorkItemIssueResponseSchema = z.object({
  issue: z.object({
    id: z.number().int().positive(),
    workItemId: z.number().int().positive(),
    category: WorkItemIssueCategorySchema,
    status: WorkItemIssueStatusSchema,
    note: z.string(),
    createdBy: z.string().uuid().nullable(),
    createdByName: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    closedAt: z.string().datetime().nullable(),
  }),
  telegram: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('queued'),
      deliveryId: z.number().int().positive(),
    }),
    z.object({
      status: z.literal('skipped'),
      reason: z.enum(['not_configured', 'disabled']),
      deliveryId: z.number().int().positive(),
    }),
  ]),
})

export type ReportWorkItemIssueRequest = z.infer<typeof ReportWorkItemIssueRequestSchema>
export type ReportWorkItemIssueResponse = z.infer<typeof ReportWorkItemIssueResponseSchema>
