<script setup lang="ts">
import { Boxes, Menu, Wrench, X } from '@lucide/vue'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const route = useRoute()
const isOpen = ref(false)

const links = [
  {
    to: '/manager/bays',
    label: 'Bay 목록',
    description: '전체 Bay 상태와 작업 진행률 확인',
    icon: Boxes,
  },
  {
    to: '/bay',
    label: '작업 운영',
    description: 'Bay별 작업 상세 운영',
    icon: Wrench,
  },
]

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
  },
)

function isCurrent(path: string) {
  return path === '/bay' ? route.path === path : route.path.startsWith(path)
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetTrigger as-child>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 transition hover:bg-emerald-100 sm:hidden"
        aria-label="운영 관리자 메뉴 열기"
      >
        <Menu class="size-4" />
      </button>
    </SheetTrigger>

    <SheetContent
      side="right"
      :show-close-button="false"
      class="w-[19rem] max-w-[88vw] border-l border-[#dce2da] bg-[#f7f9f5] p-0"
    >
      <SheetTitle class="sr-only">운영 관리자 메뉴</SheetTitle>
      <SheetDescription class="sr-only">
        Bay 목록 또는 작업 운영 화면으로 이동합니다.
      </SheetDescription>

      <div class="border-b border-[#dce2da] px-5 py-5 pr-16">
        <p class="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#718068]">
          Manager navigation
        </p>
        <p class="mt-1.5 text-base font-semibold tracking-[-0.025em] text-[#1d241c]">운영 메뉴</p>
      </div>

      <nav class="grid gap-2 p-4" aria-label="운영 관리자 메뉴">
        <SheetClose v-for="link in links" :key="link.to" as-child>
          <NuxtLink
            :to="link.to"
            class="flex items-center gap-3 rounded-xl border px-3.5 py-3.5 transition"
            :class="
              isCurrent(link.to)
                ? 'border-[#bdd49d] bg-[#eaf4dd] text-[#26321f]'
                : 'border-transparent text-[#626b60] hover:border-[#dce2da] hover:bg-white'
            "
            :aria-current="isCurrent(link.to) ? 'page' : undefined"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
            >
              <component :is="link.icon" class="size-4" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold">{{ link.label }}</span>
              <span class="mt-0.5 block text-[10px] leading-4 text-[#858d82]">
                {{ link.description }}
              </span>
            </span>
          </NuxtLink>
        </SheetClose>
      </nav>

      <SheetClose as-child>
        <button
          type="button"
          class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-lg border border-[#dce2da] bg-white text-[#5f675d]"
          aria-label="운영 관리자 메뉴 닫기"
        >
          <X class="size-4" />
        </button>
      </SheetClose>
    </SheetContent>
  </Sheet>
</template>
