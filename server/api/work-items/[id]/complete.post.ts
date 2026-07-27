import { useBackendContext } from '#server/bootstrap/backend-context'

export default defineEventHandler(event =>
  useBackendContext().workExecution.completeWorkItemController.handle(event),
)
