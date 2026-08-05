import { readBody, type H3Event } from 'h3'
import {
  ReportWorkItemIssueRequestSchema,
  type ReportWorkItemIssueResponse,
} from '#shared/api/work-items/report-work-item-issue.contract'
import { handleHttpRequest, parseRequest } from '#server/presentation/http/handle-http-request'
import { requireAppUser } from '#server/utils/auth'
import type { ReportWorkItemIssueService } from '../service/report-work-item-issue.service'
import { parseWorkItemId, toActor } from './work-item-controller.helpers'

export class ReportWorkItemIssueController {
  constructor(private readonly service: ReportWorkItemIssueService) {}

  handle(event: H3Event): Promise<ReportWorkItemIssueResponse> {
    return handleHttpRequest(async () => {
      const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
      const body = parseRequest(
        ReportWorkItemIssueRequestSchema,
        await readBody(event),
        '이슈 입력값을 확인해 주세요.',
      )
      const result = await this.service.execute({
        workItemId: parseWorkItemId(event),
        actor: toActor(profile),
        category: body.category,
        note: body.note,
      })

      return {
        issue: {
          ...result.issue,
          createdAt: result.issue.createdAt.toISOString(),
          updatedAt: result.issue.updatedAt.toISOString(),
          closedAt: result.issue.closedAt?.toISOString() ?? null,
        },
        telegram: result.notification,
      }
    })
  }
}
