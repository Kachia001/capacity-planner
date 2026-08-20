import { eq } from 'drizzle-orm'
import { siteBranding, siteLogos } from '#server/db/schema'
import type { SiteBrandingResponse, SiteLogoListItem } from '#shared/api/branding/branding.contract'
import type { DatabaseExecutor } from '#server/infrastructure/database/database.types'

export function getLogoContentUrl(id: string, version: number) {
  return `/api/logos/${encodeURIComponent(id)}/content?v=${version}`
}

export async function getSiteBranding(db: DatabaseExecutor): Promise<SiteBrandingResponse> {
  const [settings] = await db
    .select({
      activeLogoId: siteBranding.activeLogoId,
      version: siteBranding.version,
    })
    .from(siteBranding)
    .where(eq(siteBranding.id, 1))
    .limit(1)

  if (!settings?.activeLogoId) {
    return { version: settings?.version ?? 0, currentLogo: null }
  }

  const [logo] = await db
    .select({ id: siteLogos.id, width: siteLogos.width, height: siteLogos.height })
    .from(siteLogos)
    .where(eq(siteLogos.id, settings.activeLogoId))
    .limit(1)

  return {
    version: settings.version,
    currentLogo: logo
      ? {
          ...logo,
          url: getLogoContentUrl(logo.id, settings.version),
        }
      : null,
  }
}

export function mapSiteLogo(
  logo: {
    id: string
    originalName: string
    mimeType: string
    sizeBytes: number
    width: number
    height: number
    createdAt: Date
  },
  activeLogoId: string | null,
  version: number,
): SiteLogoListItem {
  return {
    id: logo.id,
    originalName: logo.originalName,
    mimeType: 'image/webp',
    sizeBytes: logo.sizeBytes,
    width: logo.width,
    height: logo.height,
    createdAt: logo.createdAt.toISOString(),
    isActive: logo.id === activeLogoId,
    url: getLogoContentUrl(logo.id, version),
  }
}
