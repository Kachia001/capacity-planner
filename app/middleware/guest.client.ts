export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  await auth.initialize()

  if (auth.user && auth.profile) {
    return navigateTo(auth.isAdmin ? '/admin' : '/bay')
  }

  if (auth.user && !auth.profile) {
    return navigateTo('/unauthorized')
  }
})
