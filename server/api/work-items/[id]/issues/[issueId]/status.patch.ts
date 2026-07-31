import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { UpdateWorkItemIssueStatusRequestSchema } from '#shared/api/work-items/update-work-item-issue-status.contract'
import { workItemIssues } from '#server/db/schema'

const idSchema = z.coerce.number().int().positive()

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const workItemId = idSchema.parse(getRouterParam(event, 'id'))
  const issueId = idSchema.parse(getRouterParam(event, 'issueId'))
  const body = UpdateWorkItemIssueStatusRequestSchema.parse(await readBody(event))
  const now = new Date()
  const [issue] = await useDb()
    .update(workItemIssues)
    .set({
      status: body.status,
      statusUpdatedBy: profile.authUserId,
      statusUpdatedAt: now,
      updatedAt: now,
    })
    .where(and(eq(workItemIssues.id, issueId), eq(workItemIssues.workItemId, workItemId)))
    .returning({
      id: workItemIssues.id,
      workItemId: workItemIssues.workItemId,
      status: workItemIssues.status,
      statusUpdatedBy: workItemIssues.statusUpdatedBy,
      statusUpdatedAt: workItemIssues.statusUpdatedAt,
      updatedAt: workItemIssues.updatedAt,
    })

  if (!issue || !issue.statusUpdatedBy || !issue.statusUpdatedAt) {
    throw createError({ statusCode: 404, statusMessage: '작업 이슈를 찾을 수 없습니다.' })
  }

  return {
    issue: {
      ...issue,
      statusUpdatedAt: issue.statusUpdatedAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    },
  }
})
