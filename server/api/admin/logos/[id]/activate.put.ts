import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { siteBranding, siteLogos } from '#server/db/schema'
import { getSiteBranding } from '#server/utils/site-branding'
import { writeApplicationLog } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const parsedId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, message: '로고를 찾을 수 없습니다.' })
  }
  const id = parsedId.data

  const db = useDb()
  const [logo] = await db
    .select({ id: siteLogos.id })
    .from(siteLogos)
    .where(eq(siteLogos.id, id))
    .limit(1)

  if (!logo) throw createError({ statusCode: 404, message: '로고를 찾을 수 없습니다.' })

  const now = new Date()
  await db.transaction(async tx => {
    await tx
      .insert(siteBranding)
      .values({
        id: 1,
        activeLogoId: id,
        version: 1,
        updatedBy: profile.authUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteBranding.id,
        set: {
          activeLogoId: id,
          version: sql`${siteBranding.version} + 1`,
          updatedBy: profile.authUserId,
          updatedAt: now,
        },
      })

    await writeApplicationLog(tx, {
      level: 'info',
      category: 'branding',
      event: 'branding.logo_activated',
      message: '관리자가 현재 사이트 로고를 변경했습니다.',
      actorUserId: profile.authUserId,
      metadata: { logoId: id },
      createdAt: now,
    })
  })

  return getSiteBranding(db)
})
