import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { UpdateWorkItemIssueStatusRequestSchema } from '#shared/api/work-items/update-work-item-issue-status.contract'
import { workItemIssues, type WorkItemIssue } from '#server/db/schema'
import { canTransitionWorkItemIssueStatus } from '#server/modules/work-execution/domain/work-item-issue-status'

const idSchema = z.coerce.number().int().positive()

const issueSelection = {
  id: workItemIssues.id,
  workItemId: workItemIssues.workItemId,
  status: workItemIssues.status,
  statusUpdatedBy: workItemIssues.statusUpdatedBy,
  createdAt: workItemIssues.createdAt,
  updatedAt: workItemIssues.updatedAt,
  closedAt: workItemIssues.closedAt,
}

type SelectedIssue = Pick<
  WorkItemIssue,
  'id' | 'workItemId' | 'status' | 'statusUpdatedBy' | 'createdAt' | 'updatedAt' | 'closedAt'
>

function serializeIssue(issue: SelectedIssue) {
  return {
    ...issue,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    closedAt: issue.closedAt?.toISOString() ?? null,
  }
}

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin', 'manager'])
  const workItemId = idSchema.parse(getRouterParam(event, 'id'))
  const issueId = idSchema.parse(getRouterParam(event, 'issueId'))
  const body = UpdateWorkItemIssueStatusRequestSchema.parse(await readBody(event))
  const db = useDb()
  const [currentIssue] = await db
    .select(issueSelection)
    .from(workItemIssues)
    .where(and(eq(workItemIssues.id, issueId), eq(workItemIssues.workItemId, workItemId)))
    .limit(1)

  if (!currentIssue) {
    throw createError({ statusCode: 404, message: '작업 이슈를 찾을 수 없습니다.' })
  }

  if (currentIssue.status === body.status) {
    return { issue: serializeIssue(currentIssue) }
  }

  if (currentIssue.status === 'resolved') {
    throw createError({ statusCode: 409, message: '처리완료된 이슈는 변경할 수 없습니다.' })
  }

  if (!canTransitionWorkItemIssueStatus(currentIssue.status, body.status)) {
    throw createError({ statusCode: 409, message: '허용되지 않은 이슈 상태 변경입니다.' })
  }

  const now = new Date()
  const [issue] = await db
    .update(workItemIssues)
    .set({
      status: body.status,
      statusUpdatedBy: profile.authUserId,
      updatedAt: now,
      closedAt: body.status === 'resolved' ? now : null,
    })
    .where(
      and(
        eq(workItemIssues.id, issueId),
        eq(workItemIssues.workItemId, workItemId),
        eq(workItemIssues.status, currentIssue.status),
      ),
    )
    .returning(issueSelection)

  if (!issue) {
    throw createError({
      statusCode: 409,
      message: '다른 사용자가 먼저 이슈 상태를 변경했습니다.',
    })
  }

  return { issue: serializeIssue(issue) }
})
