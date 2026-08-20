import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { siteBranding, siteLogos } from '#server/db/schema'
import { deleteStoredLogo } from '#server/utils/logo-storage'
import { writeApplicationLog, writeApplicationLogBestEffort } from '#server/utils/application-log'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const parsedId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 404, message: '로고를 찾을 수 없습니다.' })
  }
  const id = parsedId.data

  const db = useDb()
  const [logo] = await db.select().from(siteLogos).where(eq(siteLogos.id, id)).limit(1)
  if (!logo) throw createError({ statusCode: 404, message: '로고를 찾을 수 없습니다.' })

  const [settings] = await db
    .select({ activeLogoId: siteBranding.activeLogoId })
    .from(siteBranding)
    .where(eq(siteBranding.id, 1))
    .limit(1)

  if (settings?.activeLogoId === id) {
    throw createError({
      statusCode: 409,
      message: '현재 사용 중인 로고는 삭제할 수 없습니다. 다른 로고를 먼저 선택해 주세요.',
    })
  }

  const now = new Date()
  await db.transaction(async tx => {
    await tx.delete(siteLogos).where(eq(siteLogos.id, id))
    await writeApplicationLog(tx, {
      level: 'warn',
      category: 'branding',
      event: 'branding.logo_deleted',
      message: '관리자가 업로드된 사이트 로고를 삭제했습니다.',
      actorUserId: profile.authUserId,
      metadata: { logoId: id, originalName: logo.originalName },
      createdAt: now,
    })
  })

  try {
    await deleteStoredLogo(logo.storageKey)
  } catch (error) {
    await writeApplicationLogBestEffort({
      level: 'error',
      category: 'branding',
      event: 'branding.logo_file_delete_failed',
      message: '삭제된 로고의 실제 파일을 제거하지 못했습니다.',
      actorUserId: profile.authUserId,
      metadata: { logoId: id, storageKey: logo.storageKey },
      errorStack: error instanceof Error ? error.stack : String(error),
    })
  }

  return { deleted: true }
})
