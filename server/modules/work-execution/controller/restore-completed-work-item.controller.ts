import { readBody, type H3Event } from 'h3'
import {
  RestoreCompletedWorkItemRequestSchema,
  type RestoreCompletedWorkItemResponse,
} from '#shared/api/work-items/restore-completed-work-item.contract'
import { handleHttpRequest, parseRequest } from '#server/presentation/http/handle-http-request'
import { requireAppUser } from '#server/utils/auth'
import type { RestoreCompletedWorkItemService } from '../service/restore-completed-work-item.service'
import { parseWorkItemId, toActor } from './work-item-controller.helpers'

export class RestoreCompletedWorkItemController {
  constructor(private readonly service: RestoreCompletedWorkItemService) {}

  handle(event: H3Event): Promise<RestoreCompletedWorkItemResponse> {
    return handleHttpRequest(async () => {
      const { profile } = await requireAppUser(event, ['admin', 'manager'])
      const body = parseRequest(
        RestoreCompletedWorkItemRequestSchema,
        await readBody(event),
        '복구 상태와 사유를 확인해 주세요.',
      )
      const result = await this.service.execute({
        workItemId: parseWorkItemId(event),
        actor: toActor(profile),
        targetStatus: body.targetStatus,
        reason: body.reason,
      })

      return {
        id: result.id,
        status: result.status,
        startedBy: result.startedBy,
        startedAt: result.startedAt?.toISOString() ?? null,
        completedBy: result.completedBy,
        completedAt: result.completedAt?.toISOString() ?? null,
        version: result.version,
      }
    })
  }
}
