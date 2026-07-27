import { createWorkExecutionModule } from '#server/modules/work-execution/work-execution.module'
import { useDb } from '#server/utils/db'

export function createBackendContext() {
  const db = useDb()

  return {
    workExecution: createWorkExecutionModule(db),
  }
}

export type BackendContext = ReturnType<typeof createBackendContext>

let context: BackendContext | undefined

export function useBackendContext() {
  context ??= createBackendContext()
  return context
}
