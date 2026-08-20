import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { siteLogos } from '#server/db/schema'
import { readStoredLogo } from '#server/utils/logo-storage'

export default defineEventHandler(async event => {
  const parsedId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, message: '로고를 찾을 수 없습니다.' })
  }
  const id = parsedId.data

  const [logo] = await useDb()
    .select({ storageKey: siteLogos.storageKey })
    .from(siteLogos)
    .where(eq(siteLogos.id, id))
    .limit(1)

  if (!logo) {
    throw createError({ statusCode: 404, message: '로고를 찾을 수 없습니다.' })
  }

  let image: Buffer
  try {
    image = await readStoredLogo(logo.storageKey)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({ statusCode: 404, message: '로고 파일을 찾을 수 없습니다.' })
    }
    throw error
  }

  setResponseHeaders(event, {
    'Content-Type': 'image/webp',
    'Content-Length': String(image.byteLength),
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: `"logo-${id}"`,
    'X-Content-Type-Options': 'nosniff',
  })
  return send(event, image)
})
