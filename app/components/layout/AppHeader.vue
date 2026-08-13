<script setup lang="ts">
import { Boxes, LogOut } from '@lucide/vue'
import AppMobileNavigation from '@/components/navigation/AppMobileNavigation.vue'
import { Button } from '@/components/ui/button'
import AttendanceControl from '@/components/attendance/AttendanceControl.vue'

const route = useRoute()
const auth = useAuthStore()
const homePath = computed(() => (auth.isSupervisor ? '/admin' : '/bay'))

const pageContext = computed(() => {
  if (route.path === '/admin') {
    return { eyebrow: 'OPERATIONS OVERVIEW', title: '관리자 대시보드' }
  }

  if (route.path === '/bay') {
    const targetBay = typeof route.query.targetBay === 'string' ? route.query.targetBay : ''

    return {
      eyebrow: 'BAY OPERATIONS',
      title: targetBay ? `${targetBay} 상세 운영` : 'Bay 상세 운영',
    }
  }

  if (route.path.startsWith('/admin/tables')) {
    return { eyebrow: 'TABLE OPERATIONS', title: '테이블 배치 현황' }
  }

  if (route.path.startsWith('/admin/bay-templates')) {
    return { eyebrow: 'BAY MANAGEMENT', title: '베이 생성 옵션' }
  }

  if (route.path.startsWith('/admin/packing-templates')) {
    return { eyebrow: 'PACKING MANAGEMENT', title: '패킹 리스트 관리' }
  }

  if (route.path === '/admin/bays/new') {
    return { eyebrow: 'BAY MANAGEMENT', title: 'Bay 생성' }
  }

  if (route.path.startsWith('/admin/accounts')) {
    return { eyebrow: 'ACCESS CONTROL', title: '계정관리' }
  }

  if (route.path.startsWith('/admin/attendance')) {
    return { eyebrow: 'ATTENDANCE', title: '출퇴근 관리' }
  }

  if (route.path.startsWith('/admin/notifications')) {
    return { eyebrow: 'NOTIFICATION SETTINGS', title: 'Telegram 알림' }
  }

  if (route.path.startsWith('/admin/logs')) {
    return { eyebrow: 'SYSTEM AUDIT', title: '서버 로그' }
  }

  return { eyebrow: 'BAY MANAGEMENT', title: 'Bay 조회' }
})

const loginId = computed(() => {
  const email = auth.profile?.email || auth.user?.email || ''
  return email.split('@')[0] || '확인 중'
})
const displayName = computed(() => auth.profile?.displayName || loginId.value)
const roleLabel = computed(() => {
  if (auth.profile?.role === 'admin') return '시스템 관리자'
  if (auth.profile?.role === 'manager') return '운영 관리자'
  if (auth.profile?.role === 'worker') return '작업자'
  return '권한 확인 중'
})
const initials = computed(() => displayName.value.trim().slice(0, 2).toUpperCase())

async function signOut() {
  await auth.signOut()
  await navigateTo('/login')
}

onMounted(() => {
  void auth.initialize()
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[#d9ddd5] bg-[#fafbf8]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:h-20 sm:px-6 lg:px-8 xl:px-10"
  >
    <NuxtLink
      :to="homePath"
      class="relative flex min-w-0 shrink items-center gap-2.5 sm:shrink-0 sm:gap-3"
    >
      <span
        data-layout="mobile"
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#c5f277] text-[#111512] shadow-[0_0_32px_rgba(197,242,119,0.16)] sm:hidden"
      >
        <Boxes class="size-5" stroke-width="2.2" />
      </span>
      <span
        data-layout="desktop"
        class="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-[#c5f277] text-[#111512] shadow-[0_0_32px_rgba(197,242,119,0.16)] sm:flex"
      >
        <Boxes class="size-5" stroke-width="2.2" />
      </span>
      <span class="min-w-0">
        <strong class="block truncate text-[13px] font-semibold tracking-[-0.02em] sm:text-[15px]">
          Capacity Planner
        </strong>
        <span
          class="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500 sm:block"
        >
          Operations console
        </span>
      </span>
    </NuxtLink>

    <section class="ml-auto flex min-w-0 items-center justify-end gap-3">
      <AttendanceControl v-if="auth.profile?.role === 'worker'" />
      <div class="hidden min-w-0 text-right sm:block lg:text-left">
        <p class="font-mono text-[9px] font-semibold tracking-[0.2em] text-[#6d756c]">
          {{ pageContext.eyebrow }}
        </p>
        <h1 class="mt-1 truncate text-lg font-semibold tracking-tight">
          {{ pageContext.title }}
        </h1>
      </div>

      <div
        class="hidden h-11 items-center divide-x divide-[#d9ddd5] rounded-lg border border-[#d9ddd5] bg-white shadow-[0_6px_24px_rgba(24,35,26,0.05)] lg:flex"
      >
        <div class="flex items-center gap-3 px-4">
          <span
            class="flex size-7 items-center justify-center rounded-md bg-[#edf3e7] font-mono text-[10px] font-bold text-[#425238]"
          >
            {{ initials }}
          </span>
          <div class="leading-none">
            <p class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#90978e]">접속 ID</p>
            <p class="mt-1.5 max-w-36 truncate text-xs font-semibold">{{ loginId }}</p>
          </div>
        </div>
        <div class="px-4 leading-none">
          <p class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#90978e]">직책</p>
          <p class="mt-1.5 text-xs font-semibold">{{ roleLabel }}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          tone="neutral"
          size="content"
          class="h-full rounded-l-none rounded-r-lg px-4 text-xs text-[#6e756d] hover:bg-[#f1f3ee] hover:text-[#171a17]"
          :disabled="auth.pending"
          @click="signOut"
        >
          <LogOut class="size-3.5" /> 로그아웃
        </Button>
      </div>

      <AppMobileNavigation />
    </section>
  </header>
</template>
