<script setup lang="ts">
import { SearchCheck, ShieldCheck, UserRoundCheck } from '@lucide/vue'

const props = defineProps<{
  displayName: string
  bayCount: number
  isAdmin?: boolean
}>()

const eyebrow = computed(() =>
  props.isAdmin ? 'Bay execution console' : 'Worker execution console',
)
const title = computed(() =>
  props.isAdmin
    ? `${props.displayName}님의 Bay 작업 상세`
    : `${props.displayName}님의 작업 실행 화면`,
)
const description = computed(() =>
  props.isAdmin
    ? 'Bay를 선택하고 상세 작업을 검색하세요. 작업 실행은 작업자와 동일한 흐름으로 처리되며, 관리자 정정·무효화 기능은 대상 작업에서 제공합니다.'
    : 'Bay를 선택하고 상세 작업을 검색하세요. 작업 시작과 완료는 순방향으로만 처리되며, 잘못 시작한 경우 관리자에게 취소를 요청해야 합니다.',
)
</script>

<template>
  <section class="relative overflow-hidden border-b border-emerald-950 bg-zinc-950 text-white">
    <div
      class="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(52,211,153,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
    />
    <div class="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-9 lg:px-8">
      <div class="grid gap-5 sm:gap-7 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
        <div>
          <p
            class="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-300 sm:text-[11px]"
          >
            {{ eyebrow }}
          </p>
          <h1 class="mt-2.5 text-2xl font-semibold tracking-[-0.04em] sm:mt-3 sm:text-4xl">
            {{ title }}
          </h1>
          <p
            class="mt-2.5 max-w-2xl text-[13px] leading-5 text-zinc-300 sm:mt-3 sm:text-sm sm:leading-6"
          >
            {{ description }}
          </p>
        </div>

        <div
          class="grid grid-cols-3 divide-x divide-zinc-700 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900/90"
        >
          <div class="p-3 sm:p-4">
            <SearchCheck class="size-[18px] text-emerald-300 sm:size-5" />
            <p class="mt-2 text-[10px] text-zinc-400 sm:mt-3 sm:text-xs">선택 가능 Bay</p>
            <p class="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{{ props.bayCount }}</p>
          </div>
          <div class="p-3 sm:p-4">
            <UserRoundCheck class="size-[18px] text-amber-300 sm:size-5" />
            <p class="mt-2 text-[10px] text-zinc-400 sm:mt-3 sm:text-xs">상태 변경</p>
            <p class="mt-1 text-xs font-semibold sm:text-sm">
              {{ props.isAdmin ? '관리자 제어' : '순방향 전용' }}
            </p>
          </div>
          <div class="p-3 sm:p-4">
            <ShieldCheck class="size-[18px] text-sky-300 sm:size-5" />
            <p class="mt-2 text-[10px] text-zinc-400 sm:mt-3 sm:text-xs">안전 구분</p>
            <p class="mt-1 text-xs font-semibold sm:text-sm">항상 표시</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
