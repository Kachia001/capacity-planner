<script setup lang="ts">
import { LogOut, Menu, X } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import AdminNavigationContent from './AdminNavigationContent.vue'

const route = useRoute()
const auth = useAuthStore()
const isOpen = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')

const loginId = computed(() => {
  const email = auth.profile?.email || auth.user?.email || ''
  return email.split('@')[0] || '확인 중'
})

const roleLabel = computed(() => {
  if (auth.profile?.role === 'admin') return '시스템 관리자'
  if (auth.profile?.role === 'manager') return '운영 관리자'
  if (auth.profile?.role === 'worker') return '작업자'
  return '권한 확인 중'
})

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
  },
)

watch(isDesktop, desktop => {
  if (desktop) isOpen.value = false
})

async function signOut() {
  await auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetTrigger as-child>
      <button
        type="button"
        class="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#d9ddd5] bg-white text-[#303630] shadow-[0_6px_24px_rgba(24,35,26,0.06)] transition hover:bg-[#f1f3ee] lg:hidden"
        aria-label="내비게이션 열기"
      >
        <Menu class="size-5" />
      </button>
    </SheetTrigger>

    <SheetContent
      side="right"
      :show-close-button="false"
      class="gap-0 border-l border-white/[0.07] bg-[#111512] p-0 text-white duration-500 data-[side=right]:w-72 data-[side=right]:max-w-[85vw] data-[side=right]:sm:max-w-none lg:hidden"
    >
      <SheetTitle class="sr-only">관리자 내비게이션</SheetTitle>
      <SheetDescription class="sr-only">
        관리자 메뉴를 선택하여 페이지를 이동합니다.
      </SheetDescription>

      <div class="relative shrink-0 border-t border-white/[0.07] px-5 py-4">
        <div class="flex min-w-0 items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-zinc-200">{{ loginId }}</p>
            <p class="mt-1 text-[10px] text-zinc-500">{{ roleLabel }}</p>
          </div>
          <button
            type="button"
            class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="auth.pending"
            aria-label="로그아웃"
            @click="signOut"
          >
            <LogOut class="size-4" />
          </button>
        </div>
      </div>

      <AdminNavigationContent />

      <!--      <SheetClose as-child>-->
      <!--        <button-->
      <!--          type="button"-->
      <!--          class="absolute right-4 top-7 z-10 flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:bg-white/10 hover:text-white"-->
      <!--          aria-label="내비게이션 닫기"-->
      <!--        >-->
      <!--          <X class="size-5" />-->
      <!--        </button>-->
      <!--      </SheetClose>-->
    </SheetContent>
  </Sheet>
</template>
