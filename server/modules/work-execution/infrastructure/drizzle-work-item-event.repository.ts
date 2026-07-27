import { workItemStatusEvents } from '#server/db/schema'
import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'
import type { WorkItemStatusEvent } from '../domain/work-item.types'
import type { WorkItemEventRepository } from '../repository/work-item-event.repository'

export class DrizzleWorkItemEventRepository implements WorkItemEventRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async append(events: WorkItemStatusEvent[]) {
    if (events.length === 0) {
      return
    }

    await this.db.insert(workItemStatusEvents).values(
      events.map(event => ({
        workItemId: event.workItemId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        action: event.action,
        actorUserId: event.actorUserId,
        actorRoleSnapshot: event.actorRole,
        reason: event.reason,
        createdAt: event.occurredAt,
      })),
    )
  }
}
