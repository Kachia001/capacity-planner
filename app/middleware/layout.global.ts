const DEFAULT_LAYOUT_ROUTES = new Set(['/login', '/change-password', '/unauthorized'])

export default defineNuxtRouteMiddleware(async to => {
  const auth = useAuthStore()

  await auth.initialize()

  if (auth.requiresPasswordChange && to.path !== '/change-password') {
    return navigateTo({
      path: '/change-password',
      query: to.path === '/login' ? undefined : { redirect: to.fullPath },
    })
  }

  if (DEFAULT_LAYOUT_ROUTES.has(to.path)) {
    setPageLayout('default')
    return
  }

  // 로그인 후 화면은 역할과 관계없이 공용 애플리케이션 셸을 사용합니다.
  // 실제 접근 권한은 각 페이지의 auth/role middleware가 검증합니다.
  setPageLayout('app')
})
