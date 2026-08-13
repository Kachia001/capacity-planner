import { getHeader, getMethod, getRequestURL } from 'h3'
import {
  getErrorStack,
  shouldCaptureApplicationError,
  writeApplicationLogBestEffort,
} from '#server/utils/application-log'

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('error', async (error, context) => {
    const event = context.event
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    if (!shouldCaptureApplicationError(statusCode)) return

    const actorUserId = event?.context.applicationActorUserId

    await writeApplicationLogBestEffort({
      level: 'error',
      category: 'system',
      event: 'server.error',
      message: '서버 요청 처리 중 오류가 발생했습니다.',
      actorUserId: typeof actorUserId === 'string' ? actorUserId : null,
      metadata: event
        ? {
            method: getMethod(event),
            path: getRequestURL(event).pathname,
            statusCode,
            requestId: getHeader(event, 'x-request-id') ?? null,
          }
        : { statusCode },
      errorStack: getErrorStack(error),
    })
  })
})
