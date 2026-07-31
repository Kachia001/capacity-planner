import { z } from 'zod'

export const UpdateWorkItemIssueContentRequestSchema = z.object({
  note: z.string().trim().min(3).max(1000),
})

export const UpdateWorkItemIssueContentResponseSchema = z.object({
  issue: z.object({
    id: z.number().int().positive(),
    workItemId: z.number().int().positive(),
    note: z.string(),
    updatedAt: z.string().datetime(),
  }),
})

export type UpdateWorkItemIssueContentRequest = z.infer<
  typeof UpdateWorkItemIssueContentRequestSchema
>
export type UpdateWorkItemIssueContentResponse = z.infer<
  typeof UpdateWorkItemIssueContentResponseSchema
>
