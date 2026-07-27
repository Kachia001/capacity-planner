export interface OperationGate {
  ensureOpen(now: Date): Promise<void>
}
