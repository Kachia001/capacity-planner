import type { H3Event } from 'h3'
import type { CompleteWorkItemResponse } from '#shared/api/work-items/complete-work-item.contract'
import { handleHttpRequest } from '#server/presentation/http/handle-http-request'
import { requireAppUser } from '#server/utils/auth'
import type { CompleteWorkItemService } from '../service/complete-work-item.service'
import { parseWorkItemId, toActor } from './work-item-controller.helpers'

export class CompleteWorkItemController {
  constructor(private readonly service: CompleteWorkItemService) {}

  handle(event: H3Event): Promise<CompleteWorkItemResponse> {
    return handleHttpRequest(async () => {
      const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
      const result = await this.service.execute({
        workItemId: parseWorkItemId(event),
        actor: toActor(profile),
      })

      return {
        id: result.id,
        status: result.status,
        completedBy: result.completedBy!,
        completedAt: result.completedAt!.toISOString(),
        version: result.version,
      }
    })
  }
}
