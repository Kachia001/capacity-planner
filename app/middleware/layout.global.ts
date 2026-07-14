const DEFAULT_LAYOUT_ROUTES = new Set(['/login', '/unauthorized'])

export default defineNuxtRouteMiddleware(async to => {
  const auth = useAuthStore()

  await auth.initialize()

  if (DEFAULT_LAYOUT_ROUTES.has(to.path)) {
    setPageLayout('default')
    return
  }

  if (to.path.startsWith('/admin')) {
    setPageLayout('admin')
    return
  }

  // 레이아웃은 표현만 결정합니다. 실제 접근 권한은 각 페이지의 auth/role middleware가 검증합니다.
  setPageLayout(auth.isAdmin ? 'admin' : 'default')
})
