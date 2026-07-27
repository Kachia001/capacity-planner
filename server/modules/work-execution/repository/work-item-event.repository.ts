import type { WorkItemStatusEvent } from '../domain/work-item.types'

export interface WorkItemEventRepository {
  append(events: WorkItemStatusEvent[]): Promise<void>
}
