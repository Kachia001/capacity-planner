import { desc, eq } from 'drizzle-orm'
import { siteBranding, siteLogos } from '#server/db/schema'
import { getSiteBranding, mapSiteLogo } from '#server/utils/site-branding'
import type { SiteLogoListResponse } from '#shared/api/branding/branding.contract'

export default defineEventHandler(async event => {
  await requireAppUser(event, ['admin'])
  const db = useDb()
  const [branding, logos, settings] = await Promise.all([
    getSiteBranding(db),
    db.select().from(siteLogos).orderBy(desc(siteLogos.createdAt)),
    db
      .select({ activeLogoId: siteBranding.activeLogoId })
      .from(siteBranding)
      .where(eq(siteBranding.id, 1))
      .limit(1),
  ])
  const activeLogoId = settings[0]?.activeLogoId ?? null

  return {
    ...branding,
    logos: logos.map(logo => mapSiteLogo(logo, activeLogoId, branding.version)),
  } satisfies SiteLogoListResponse
})
