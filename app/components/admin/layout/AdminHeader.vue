<script setup lang="ts">
import { Boxes, LogOut } from '@lucide/vue'

const route = useRoute()
const auth = useAuthStore()

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

  if (route.path.startsWith('/admin/bay-templates')) {
    return { eyebrow: 'BAY MANAGEMENT', title: 'Bay Template 생성' }
  }

  if (route.path === '/admin/bays/new') {
    return { eyebrow: 'BAY MANAGEMENT', title: 'Bay 생성' }
  }

  if (route.path.startsWith('/admin/accounts')) {
    return { eyebrow: 'ACCESS CONTROL', title: '계정관리' }
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
    class="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between gap-3 border-b border-[#d9ddd5] bg-[#fafbf8]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8 xl:px-10"
  >
    <NuxtLink
      to="/admin"
      class="relative flex h-24 shrink-0 items-center gap-3 border-b border-white/[0.07] px-7"
    >
      <span
        class="flex size-10 items-center justify-center rounded-lg bg-[#c5f277] text-[#111512] shadow-[0_0_32px_rgba(197,242,119,0.16)]"
      >
        <Boxes class="size-5" stroke-width="2.2" />
      </span>
      <span>
        <strong class="block text-[15px] font-semibold tracking-[-0.02em]">
          Capacity Planner
        </strong>
        <span class="mt-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
          Admin console
        </span>
      </span>
    </NuxtLink>

    <section class="flex justify-center gap-2">
      <div class="min-w-0">
        <p class="font-mono text-[9px] font-semibold tracking-[0.2em] text-[#6d756c]">
          {{ pageContext.eyebrow }}
        </p>
        <h1 class="mt-1 truncate text-lg font-semibold tracking-[-0.025em]">
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
        <button
          type="button"
          class="flex h-full items-center gap-2 rounded-r-lg px-4 text-xs font-semibold text-[#6e756d] transition hover:bg-[#f1f3ee] hover:text-[#171a17] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="auth.pending"
          @click="signOut"
        >
          <LogOut class="size-3.5" /> 로그아웃
        </button>
      </div>
    </section>
  </header>
</template>
