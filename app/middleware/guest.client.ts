export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.initialize()

  if (auth.user && auth.profile) {
    return navigateTo(auth.isAdmin ? '/admin/bays' : '/bay')
  }

  if (auth.user && !auth.profile) {
    return navigateTo('/unauthorized')
  }
})
