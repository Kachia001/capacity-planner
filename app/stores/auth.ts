export type AppRole = 'admin' | 'manager' | 'worker'

export type AppUserProfile = {
  id: string
  email: string
  displayName: string | null
  role: AppRole
  authEmail?: string
}

type AuthUser = {
  id: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const profile = ref<AppUserProfile | null>(null)
  const initialized = ref(false)
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)

  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isSupervisor = computed(
    () => profile.value?.role === 'admin' || profile.value?.role === 'manager',
  )

  function setProfile(nextProfile: AppUserProfile | null) {
    profile.value = nextProfile
    user.value = nextProfile
      ? {
          id: nextProfile.id,
          email: nextProfile.authEmail ?? nextProfile.email,
        }
      : null
  }

  async function initialize() {
    if (!import.meta.client || initialized.value) {
      return
    }

    try {
      setProfile(await $fetch<AppUserProfile>('/api/me'))
    } catch {
      setProfile(null)
    } finally {
      initialized.value = true
    }
  }

  async function signIn(loginId: string, password: string) {
    pending.value = true
    errorMessage.value = null

    try {
      const nextProfile = await $fetch<AppUserProfile>('/api/auth/login', {
        method: 'POST',
        body: { loginId, password },
      })
      setProfile(nextProfile)
      initialized.value = true
    } catch (error) {
      setProfile(null)
      errorMessage.value =
        typeof error === 'object' &&
        error &&
        'data' in error &&
        typeof error.data === 'object' &&
        error.data &&
        'statusMessage' in error.data &&
        typeof error.data.statusMessage === 'string'
          ? error.data.statusMessage
          : error instanceof Error
            ? error.message
            : '로그인에 실패했습니다.'
      throw error
    } finally {
      pending.value = false
    }
  }

  async function signOut() {
    pending.value = true
    errorMessage.value = null

    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setProfile(null)
      initialized.value = true
      pending.value = false
    }
  }

  function forceSignOut() {
    setProfile(null)
    initialized.value = true
    pending.value = false
  }

  return {
    user,
    profile,
    initialized,
    pending,
    errorMessage,
    isAdmin,
    isSupervisor,
    initialize,
    signIn,
    signOut,
    forceSignOut,
  }
})
