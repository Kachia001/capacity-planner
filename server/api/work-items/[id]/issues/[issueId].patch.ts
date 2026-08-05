import { and, eq, ne } from 'drizzle-orm'
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
    const db = useDb()
    const [issue] = await db
      .update(workItemIssues)
      .set({
        note: body.note,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workItemIssues.id, issueId),
          eq(workItemIssues.workItemId, workItemId),
          ne(workItemIssues.status, 'resolved'),
        ),
      )
      .returning({
        id: workItemIssues.id,
        workItemId: workItemIssues.workItemId,
        note: workItemIssues.note,
        updatedAt: workItemIssues.updatedAt,
      })

    if (!issue) {
      const [existingIssue] = await db
        .select({ status: workItemIssues.status })
        .from(workItemIssues)
        .where(and(eq(workItemIssues.id, issueId), eq(workItemIssues.workItemId, workItemId)))
        .limit(1)

      if (existingIssue?.status === 'resolved') {
        throw createError({
          statusCode: 409,
          statusMessage: '처리완료된 이슈는 변경할 수 없습니다.',
        })
      }

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
