<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import HeaderAdminAction from '@/components/layout/HeaderAdminAction.vue'

const auth = useAuthStore()

const roleLabel = computed(() => {
  if (auth.profile?.role === 'admin') return 'Admin'
  if (auth.profile?.role === 'manager') return '운영 관리자'
  if (auth.profile?.role === 'worker') return '작업자'
  return ''
})

onMounted(() => {
  void auth.initialize()
})

async function signOut() {
  await auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-emerald-200/70 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
  >
    <div
      class="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:min-h-0 sm:px-6 sm:py-4 lg:px-8"
    >
      <NuxtLink to="/bay" class="flex min-w-0 flex-col">
        <span class="truncate text-base font-semibold tracking-tight sm:text-lg"
          >Capacity Planner</span
        >
        <span class="hidden truncate text-xs font-medium text-muted-foreground sm:block"
          >Bay workload dashboard</span
        >
      </NuxtLink>

      <nav
        class="flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground sm:gap-4"
      >
        <ClientOnly>
          <div class="flex items-center gap-2">
            <NuxtLink
              v-if="auth.user"
              to="/bay"
              class="hidden transition hover:text-foreground sm:inline"
            >
              {{ auth.profile?.role === 'worker' ? '작업 실행' : '운영 현황' }}
            </NuxtLink>
            <Badge
              v-if="roleLabel"
              variant="outline"
              class="inline-flex h-7 max-w-24 truncate border-emerald-200 bg-emerald-50 px-2 text-[10px] text-emerald-800 sm:max-w-none sm:text-xs"
            >
              {{ roleLabel }}
            </Badge>
            <HeaderAdminAction v-if="auth.user && auth.isAdmin" />

            <Button
              v-if="auth.user"
              variant="secondary"
              size="sm"
              :disabled="auth.pending"
              :aria-label="`${roleLabel} 계정 로그아웃`"
              class="size-10 gap-2 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
              @click="signOut"
            >
              <LogOut class="size-4 shrink-0 overflow-visible" />
              <span class="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        </ClientOnly>
      </nav>
    </div>
  </header>
</template>
