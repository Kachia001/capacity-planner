export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  await auth.initialize()

  if (!auth.user) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    })
  }

  if (!auth.profile) {
    return navigateTo('/unauthorized')
  }
})
