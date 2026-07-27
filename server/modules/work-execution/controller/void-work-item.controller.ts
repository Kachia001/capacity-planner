import { readBody, type H3Event } from 'h3'
import {
  VoidWorkItemRequestSchema,
  type VoidWorkItemResponse,
} from '#shared/api/work-items/void-work-item.contract'
import { handleHttpRequest, parseRequest } from '#server/presentation/http/handle-http-request'
import { requireAppUser } from '#server/utils/auth'
import type { VoidWorkItemService } from '../service/void-work-item.service'
import { parseWorkItemId, toActor } from './work-item-controller.helpers'

export class VoidWorkItemController {
  constructor(private readonly service: VoidWorkItemService) {}

  handle(event: H3Event): Promise<VoidWorkItemResponse> {
    return handleHttpRequest(async () => {
      const { profile } = await requireAppUser(event, ['admin'])
      const body = parseRequest(
        VoidWorkItemRequestSchema,
        await readBody(event),
        '무효화 사유를 3자 이상 500자 이하로 입력해 주세요.',
      )
      const result = await this.service.execute({
        workItemId: parseWorkItemId(event),
        actor: toActor(profile),
        reason: body.reason,
      })

      return {
        id: result.id,
        status: result.status,
        voidedAt: result.voidedAt!.toISOString(),
        version: result.version,
      }
    })
  }
}
