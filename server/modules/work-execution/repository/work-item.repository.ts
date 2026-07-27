import type { WorkItem } from '../domain/work-item'

export interface WorkItemRepository {
  findById(id: number): Promise<WorkItem | null>
  save(workItem: WorkItem): Promise<void>
}
