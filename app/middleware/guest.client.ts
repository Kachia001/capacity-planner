export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.initialize()

  if (auth.user && auth.profile) {
    if (auth.requiresPasswordChange) {
      return navigateTo('/change-password')
    }
    return navigateTo(auth.isSupervisor ? '/admin' : '/bay')
  }

  if (auth.user && !auth.profile) {
    return navigateTo('/unauthorized')
  }
})
