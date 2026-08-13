export interface OperationGate {
  ensureOpen(now: Date, userId: string): Promise<void>
}
