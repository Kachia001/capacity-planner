import type { AuthChangeEvent, Session, Subscription, User } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'manager' | 'worker'

export type AppUserProfile = {
  id: string
  email: string
  displayName: string | null
  role: AppRole
  authEmail?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<AppUserProfile | null>(null)
  const initialized = ref(false)
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)

  const canManageUsers = computed(() => profile.value?.role === 'admin' || profile.value?.role === 'manager')
  const isAdmin = computed(() => profile.value?.role === 'admin')

  let subscription: Subscription | undefined

  function setSession(nextSession: Session | null) {
    session.value = nextSession
    user.value = nextSession?.user ?? null

    if (!nextSession) {
      profile.value = null
    }
  }

  async function loadProfile(accessToken: string) {
    try {
      profile.value = await $fetch<AppUserProfile>('/api/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch (error) {
      profile.value = null
      errorMessage.value = error instanceof Error ? error.message : '계정 권한 정보를 불러오지 못했습니다.'
    }
  }

  async function initialize() {
    if (!import.meta.client || initialized.value) {
      return
    }

    const supabase = useSupabaseBrowserClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      errorMessage.value = error.message
    }

    setSession(data.session)

    if (data.session?.access_token) {
      await loadProfile(data.session.access_token)
    }

    initialized.value = true

    if (!subscription) {
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, nextSession: Session | null) => {
          setSession(nextSession)

          if (nextSession?.access_token) {
            void loadProfile(nextSession.access_token)
          }
        },
      )

      subscription = listener.subscription
    }
  }

  function normalizeLoginId(loginId: string) {
    return loginId.includes('@') ? loginId : `${loginId}@capacity-planner.local`
  }

  async function signIn(loginId: string, password: string) {
    pending.value = true
    errorMessage.value = null

    try {
      const supabase = useSupabaseBrowserClient()
      const email = normalizeLoginId(loginId)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        throw error
      }

      setSession(data.session)

      if (data.session?.access_token) {
        await loadProfile(data.session.access_token)
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to sign in.'
      throw error
    } finally {
      pending.value = false
    }
  }

  async function signOut() {
    pending.value = true
    errorMessage.value = null

    try {
      const supabase = useSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setSession(null)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to sign out.'
      throw error
    } finally {
      pending.value = false
    }
  }

  async function getAccessToken() {
    await initialize()

    const supabase = useSupabaseBrowserClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      errorMessage.value = error.message
      throw error
    }

    setSession(data.session)

    if (data.session?.access_token && !profile.value) {
      await loadProfile(data.session.access_token)
    }

    return data.session?.access_token ?? null
  }

  return {
    user,
    session,
    profile,
    initialized,
    pending,
    errorMessage,
    canManageUsers,
    isAdmin,
    initialize,
    signIn,
    signOut,
    getAccessToken,
  }
})
