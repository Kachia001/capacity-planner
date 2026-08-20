import { getSiteBranding } from '#server/utils/site-branding'

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
  })

  return getSiteBranding(useDb())
})
