import { getRouterParam, type H3Event } from 'h3'
import { WorkItemIdParamsSchema } from '#shared/api/work-items/work-item.contract'
import type { AppUser } from '#server/db/schema'
import { parseRequest } from '#server/presentation/http/handle-http-request'
import type { Actor } from '../domain/work-item.types'

export function parseWorkItemId(event: H3Event) {
  return parseRequest(
    WorkItemIdParamsSchema,
    { id: getRouterParam(event, 'id') },
    '올바른 작업 ID가 필요합니다.',
  ).id
}

export function toActor(profile: AppUser): Actor {
  return {
    userId: profile.authUserId,
    role: profile.role,
    displayName: profile.displayName?.trim() || profile.email,
  }
}
