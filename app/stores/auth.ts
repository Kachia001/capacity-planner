export type AppRole = 'admin' | 'manager' | 'worker'

export type AppUserProfile = {
  id: string
  email: string
  displayName: string | null
  role: AppRole
  authEmail?: string
  mustChangePassword: boolean
}

type AuthUser = {
  id: string
  email: string
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data) {
      if ('message' in data && typeof data.message === 'string' && data.message.trim()) {
        return data.message
      }
      if (
        'statusMessage' in data &&
        typeof data.statusMessage === 'string' &&
        data.statusMessage.trim()
      ) {
        return data.statusMessage
      }
    }
  }

  return fallback
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
  const requiresPasswordChange = computed(() => profile.value?.mustChangePassword === true)

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
      errorMessage.value = getAuthErrorMessage(error, '로그인에 실패했습니다.')
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

  async function changePassword(newPassword: string, currentPassword?: string) {
    pending.value = true
    errorMessage.value = null

    try {
      const nextProfile = await $fetch<AppUserProfile>('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      setProfile(nextProfile)
      initialized.value = true
    } catch (error) {
      errorMessage.value = getAuthErrorMessage(error, '비밀번호를 변경하지 못했습니다.')
      throw error
    } finally {
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
    requiresPasswordChange,
    initialize,
    signIn,
    signOut,
    changePassword,
    forceSignOut,
  }
})
