import { readBody, type H3Event } from 'h3'
import {
  CancelWorkItemStartRequestSchema,
  type CancelWorkItemStartResponse,
} from '#shared/api/work-items/cancel-work-item-start.contract'
import { handleHttpRequest, parseRequest } from '#server/presentation/http/handle-http-request'
import { requireAppUser } from '#server/utils/auth'
import type { CancelWorkItemStartService } from '../service/cancel-work-item-start.service'
import { parseWorkItemId, toActor } from './work-item-controller.helpers'

export class CancelWorkItemStartController {
  constructor(private readonly service: CancelWorkItemStartService) {}

  handle(event: H3Event): Promise<CancelWorkItemStartResponse> {
    return handleHttpRequest(async () => {
      const { profile } = await requireAppUser(event, ['admin', 'manager'])
      const body = parseRequest(
        CancelWorkItemStartRequestSchema,
        await readBody(event),
        '취소 사유를 3자 이상 500자 이하로 입력해 주세요.',
      )
      const result = await this.service.execute({
        workItemId: parseWorkItemId(event),
        actor: toActor(profile),
        reason: body.reason,
      })

      return {
        id: result.id,
        status: result.status,
        version: result.version,
      }
    })
  }
}
