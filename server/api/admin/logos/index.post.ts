import { siteLogos } from '#server/db/schema'
import { deleteStoredLogo, LogoStorageError, processAndStoreLogo } from '#server/utils/logo-storage'
import { mapSiteLogo } from '#server/utils/site-branding'
import { writeApplicationLog } from '#server/utils/application-log'
import type { SiteLogoUploadResponse } from '#shared/api/branding/branding.contract'

export default defineEventHandler(async event => {
  const { profile } = await requireAppUser(event, ['admin'])
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'logo' && part.filename)

  if (!file?.data?.length) {
    throw createError({ statusCode: 400, message: '업로드할 로고 이미지를 선택해 주세요.' })
  }

  let stored: Awaited<ReturnType<typeof processAndStoreLogo>>
  try {
    stored = await processAndStoreLogo({ data: file.data, filename: file.filename })
  } catch (error) {
    if (error instanceof LogoStorageError) {
      throw createError({ statusCode: 400, message: error.message, data: { code: error.code } })
    }
    throw error
  }

  try {
    const createdAt = new Date()
    const created = await useDb().transaction(async tx => {
      const [logo] = await tx
        .insert(siteLogos)
        .values({ ...stored, uploadedBy: profile.authUserId, createdAt })
        .returning()

      if (!logo) throw new Error('로고 메타데이터를 저장하지 못했습니다.')

      await writeApplicationLog(tx, {
        level: 'info',
        category: 'branding',
        event: 'branding.logo_uploaded',
        message: '관리자가 사이트 로고를 업로드했습니다.',
        actorUserId: profile.authUserId,
        metadata: {
          logoId: logo.id,
          originalName: logo.originalName,
          sizeBytes: logo.sizeBytes,
          width: logo.width,
          height: logo.height,
        },
        createdAt,
      })
      return logo
    })

    return {
      logo: mapSiteLogo(created, null, 0),
    } satisfies SiteLogoUploadResponse
  } catch (error) {
    await deleteStoredLogo(stored.storageKey).catch(() => undefined)
    throw error
  }
})
