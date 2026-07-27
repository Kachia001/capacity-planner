import { z } from 'zod'
import { IssueSeveritySchema } from './work-item.contract'

export const ReportWorkItemIssueRequestSchema = z.object({
  severity: IssueSeveritySchema,
  note: z.string().trim().min(3).max(1000),
})

export const ReportWorkItemIssueResponseSchema = z.object({
  item: z.object({
    id: z.number().int().positive(),
    hasIssue: z.literal(true),
    issueStatus: z.literal('open'),
    issueSeverity: IssueSeveritySchema,
    issueNote: z.string(),
    issueCreatedAt: z.string().datetime(),
    version: z.number().int().nonnegative(),
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
