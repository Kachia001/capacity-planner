<script setup lang="ts">
import { Boxes, ChevronRight, LogOut, MonitorCog, PanelsTopLeft, UsersRound } from '@lucide/vue'

const route = useRoute()
const auth = useAuthStore()

const navigation = [
  {
    label: 'Bay 조회',
    caption: 'Bay registry',
    to: '/admin/bays',
    icon: PanelsTopLeft,
  },
  {
    label: '계정관리',
    caption: 'Account control',
    to: '/admin/accounts',
    icon: UsersRound,
  },
]

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

function isNavigationActive(to: string) {
  if (to === '/admin/bays') {
    return (
      route.path === '/bay' ||
      route.path.startsWith('/admin/bays') ||
      route.path.startsWith('/admin/bay-templates')
    )
  }

  return route.path.startsWith(to)
}

async function signOut() {
  await auth.signOut()
  await navigateTo('/login')
}

onMounted(() => {
  void auth.initialize()
})
</script>

<template>
  <div class="min-h-screen bg-[#f2f4ef] text-[#181a18]">
    <section
      class="flex min-h-screen flex-col items-center justify-center bg-[#111512] px-6 text-center text-white lg:hidden"
    >
      <div
        class="flex size-16 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40"
      >
        <MonitorCog class="size-7 text-[#c5f277]" />
      </div>
      <p
        class="mt-8 font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[#c5f277]"
      >
        Desktop console only
      </p>
      <h1 class="mt-3 text-2xl font-semibold tracking-[-0.035em]">
        관리자 화면은 PC에서 이용해 주세요.
      </h1>
      <p class="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
        넓은 테이블과 운영 도구를 안전하게 사용하기 위해 1024px 이상의 화면에서만 관리자 콘솔을
        제공합니다.
      </p>
      <div class="mt-8 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-left">
        <p class="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Signed in as</p>
        <p class="mt-1 text-sm font-semibold">{{ loginId }} · {{ roleLabel }}</p>
      </div>
      <button
        type="button"
        class="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white"
        @click="signOut"
      >
        <LogOut class="size-4" /> 로그아웃
      </button>
    </section>

    <div class="hidden min-h-screen lg:flex">
      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-white/[0.07] bg-[#111512] text-white"
      >
        <div
          class="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_20%_0%,rgba(197,242,119,0.12),transparent_68%)]"
        />
        <NuxtLink
          to="/admin"
          class="relative flex h-24 items-center gap-3 border-b border-white/[0.07] px-7"
        >
          <span
            class="flex size-10 items-center justify-center rounded-lg bg-[#c5f277] text-[#111512] shadow-[0_0_32px_rgba(197,242,119,0.16)]"
          >
            <Boxes class="size-5" stroke-width="2.2" />
          </span>
          <span>
            <strong class="block text-[15px] font-semibold tracking-[-0.02em]"
              >Capacity Planner</strong
            >
            <span class="mt-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
              Admin console
            </span>
          </span>
        </NuxtLink>

        <nav class="relative flex-1 px-4 py-7" aria-label="관리자 주 메뉴">
          <p
            class="px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-600"
          >
            General navigation
          </p>
          <ul class="mt-3 space-y-1.5">
            <li v-for="item in navigation" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="group flex min-h-14 items-center gap-3 rounded-lg border px-3.5 py-2.5 transition duration-200"
                :class="
                  isNavigationActive(item.to)
                    ? 'border-[#c5f277]/20 bg-[#c5f277] text-[#111512] shadow-[0_10px_30px_rgba(0,0,0,0.18)]'
                    : 'border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white'
                "
                :aria-current="isNavigationActive(item.to) ? 'page' : undefined"
              >
                <component :is="item.icon" class="size-[18px] shrink-0" stroke-width="1.9" />
                <span class="min-w-0 flex-1">
                  <strong class="block text-sm font-semibold">{{ item.label }}</strong>
                  <span
                    class="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.16em]"
                    :class="isNavigationActive(item.to) ? 'text-[#111512]/55' : 'text-zinc-600'"
                  >
                    {{ item.caption }}
                  </span>
                </span>
                <ChevronRight
                  class="size-3.5 transition-transform group-hover:translate-x-0.5"
                  :class="isNavigationActive(item.to) ? 'opacity-70' : 'opacity-0'"
                />
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="relative border-t border-white/[0.07] px-7 py-5">
          <div
            class="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-zinc-600"
          >
            <span
              class="size-1.5 rounded-full bg-[#c5f277] shadow-[0_0_10px_rgba(197,242,119,0.8)]"
            />
            System online
          </div>
          <p class="mt-2 text-xs text-zinc-500">Capacity operations · v1.0</p>
        </div>
      </aside>

      <div class="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-[#d9ddd5] bg-[#fafbf8]/95 px-8 backdrop-blur-xl xl:px-10"
        >
          <div class="min-w-0">
            <p class="font-mono text-[9px] font-semibold tracking-[0.2em] text-[#6d756c]">
              {{ pageContext.eyebrow }}
            </p>
            <h1 class="mt-1 truncate text-lg font-semibold tracking-[-0.025em]">
              {{ pageContext.title }}
            </h1>
          </div>

          <div
            class="flex h-11 items-center divide-x divide-[#d9ddd5] rounded-lg border border-[#d9ddd5] bg-white shadow-[0_6px_24px_rgba(24,35,26,0.05)]"
          >
            <div class="flex items-center gap-3 px-4">
              <span
                class="flex size-7 items-center justify-center rounded-md bg-[#edf3e7] font-mono text-[10px] font-bold text-[#425238]"
              >
                {{ initials }}
              </span>
              <div class="leading-none">
                <p class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#90978e]">
                  접속 ID
                </p>
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
        </header>

        <main class="min-w-0 flex-1">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
