import { z } from 'zod'
import { WorkItemIssueStatusSchema } from './work-item.contract'

export const UpdateWorkItemIssueStatusRequestSchema = z.object({
  status: WorkItemIssueStatusSchema,
})

export const UpdateWorkItemIssueStatusResponseSchema = z.object({
  issue: z.object({
    id: z.number().int().positive(),
    workItemId: z.number().int().positive(),
    status: WorkItemIssueStatusSchema,
    statusUpdatedBy: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    closedAt: z.string().datetime().nullable(),
  }),
})

export type UpdateWorkItemIssueStatusRequest = z.infer<
  typeof UpdateWorkItemIssueStatusRequestSchema
>
export type UpdateWorkItemIssueStatusResponse = z.infer<
  typeof UpdateWorkItemIssueStatusResponseSchema
>
