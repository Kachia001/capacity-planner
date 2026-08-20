import type { SiteBrandingResponse } from '#shared/api/branding/branding.contract'

export const useBrandingStore = defineStore('branding', () => {
  const version = ref(0)
  const currentLogo = ref<SiteBrandingResponse['currentLogo']>(null)
  const initialized = ref(false)
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)
  let initializePromise: Promise<void> | null = null

  function apply(nextBranding: SiteBrandingResponse) {
    version.value = nextBranding.version
    currentLogo.value = nextBranding.currentLogo
    initialized.value = true
    errorMessage.value = null
  }

  async function initialize(force = false) {
    if (!import.meta.client || (initialized.value && !force)) return
    if (initializePromise) return initializePromise

    pending.value = true
    errorMessage.value = null
    initializePromise = $fetch<SiteBrandingResponse>('/api/site-branding')
      .then(apply)
      .catch(() => {
        currentLogo.value = null
        initialized.value = false
        errorMessage.value = '사이트 로고 정보를 불러오지 못했습니다.'
      })
      .finally(() => {
        pending.value = false
        initializePromise = null
      })

    return initializePromise
  }

  return { version, currentLogo, initialized, pending, errorMessage, apply, initialize }
})
