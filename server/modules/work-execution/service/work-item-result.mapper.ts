import type { WorkItem } from '../domain/work-item'
import type { WorkItemStateResult } from './dto/work-item-result'

export function toWorkItemStateResult(workItem: WorkItem): WorkItemStateResult {
  const snapshot = workItem.snapshot()

  return {
    id: snapshot.id,
    status: snapshot.status,
    startedBy: snapshot.startedBy,
    startedAt: snapshot.startedAt,
    completedBy: snapshot.completedBy,
    completedAt: snapshot.completedAt,
    voidedAt: snapshot.voidedAt,
    version: snapshot.version,
  }
}
