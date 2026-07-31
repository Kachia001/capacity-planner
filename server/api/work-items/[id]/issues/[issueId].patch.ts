import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  UpdateWorkItemIssueContentRequestSchema,
  type UpdateWorkItemIssueContentResponse,
} from '#shared/api/work-items/update-work-item-issue-content.contract'
import { workItemIssues } from '#server/db/schema'
import { handleHttpRequest, parseRequest } from '#server/presentation/http/handle-http-request'

const idSchema = z.coerce.number().int().positive()

export default defineEventHandler(async event =>
  handleHttpRequest<UpdateWorkItemIssueContentResponse>(async () => {
    await requireAppUser(event, ['admin', 'manager'])
    const workItemId = idSchema.parse(getRouterParam(event, 'id'))
    const issueId = idSchema.parse(getRouterParam(event, 'issueId'))
    const body = parseRequest(
      UpdateWorkItemIssueContentRequestSchema,
      await readBody(event),
      '이슈 내용을 확인해 주세요.',
    )
    const [issue] = await useDb()
      .update(workItemIssues)
      .set({
        note: body.note,
        updatedAt: new Date(),
      })
      .where(and(eq(workItemIssues.id, issueId), eq(workItemIssues.workItemId, workItemId)))
      .returning({
        id: workItemIssues.id,
        workItemId: workItemIssues.workItemId,
        note: workItemIssues.note,
        updatedAt: workItemIssues.updatedAt,
      })

    if (!issue) {
      throw createError({ statusCode: 404, statusMessage: '작업 이슈를 찾을 수 없습니다.' })
    }

    return {
      issue: {
        ...issue,
        updatedAt: issue.updatedAt.toISOString(),
      },
    }
  }),
)
