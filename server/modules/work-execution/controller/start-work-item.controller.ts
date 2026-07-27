import type { H3Event } from 'h3'
import type { StartWorkItemResponse } from '#shared/api/work-items/start-work-item.contract'
import { handleHttpRequest } from '#server/presentation/http/handle-http-request'
import { requireAppUser } from '#server/utils/auth'
import type { StartWorkItemService } from '../service/start-work-item.service'
import { parseWorkItemId, toActor } from './work-item-controller.helpers'

export class StartWorkItemController {
  constructor(private readonly service: StartWorkItemService) {}

  handle(event: H3Event): Promise<StartWorkItemResponse> {
    return handleHttpRequest(async () => {
      const { profile } = await requireAppUser(event, ['admin', 'manager', 'worker'])
      const result = await this.service.execute({
        workItemId: parseWorkItemId(event),
        actor: toActor(profile),
      })

      return {
        id: result.id,
        status: result.status,
        startedBy: result.startedBy!,
        startedAt: result.startedAt!.toISOString(),
        version: result.version,
      }
    })
  }
}
