import { getHeader, getMethod, getRequestURL } from 'h3'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler(event => {
  if (SAFE_METHODS.has(getMethod(event))) {
    return
  }

  const origin = getHeader(event, 'origin')
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      message: 'Cross-origin requests are not allowed.',
    })
  }
})
