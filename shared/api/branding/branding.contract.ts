export interface SiteLogoListItem {
  id: string
  originalName: string
  mimeType: 'image/webp'
  sizeBytes: number
  width: number
  height: number
  createdAt: string
  isActive: boolean
  url: string
}

export interface SiteBrandingResponse {
  version: number
  currentLogo: {
    id: string
    url: string
    width: number
    height: number
  } | null
}

export interface SiteLogoListResponse extends SiteBrandingResponse {
  logos: SiteLogoListItem[]
}

export interface SiteLogoUploadResponse {
  logo: SiteLogoListItem
}
