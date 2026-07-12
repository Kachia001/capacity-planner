export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  await auth.initialize()

  const roles = to.meta.roles as Array<'admin' | 'manager' | 'worker'> | undefined

  if (!roles || roles.length === 0) {
    return
  }

  if (!auth.profile || !roles.includes(auth.profile.role)) {
    return navigateTo('/unauthorized')
  }
})
