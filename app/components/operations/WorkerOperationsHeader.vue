<script setup lang="ts">
import { SearchCheck, ShieldCheck, UserRoundCheck } from '@lucide/vue'

const props = defineProps<{
  displayName: string
  bayCount: number
}>()
</script>

<template>
  <section class="relative overflow-hidden border-b border-emerald-950 bg-zinc-950 text-white">
    <div
      class="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(52,211,153,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
    />
    <div class="relative mx-auto w-full max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <div class="grid gap-7 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
        <div>
          <p class="font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-300">
            Worker execution console
          </p>
          <h1 class="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {{ props.displayName }}님의 작업 실행 화면
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            Bay를 선택하고 상세 작업을 검색하세요. 작업 시작과 완료는 순방향으로만 처리되며, 잘못
            시작한 경우 관리자에게 취소를 요청해야 합니다.
          </p>
        </div>

        <div
          class="grid grid-cols-3 divide-x divide-zinc-700 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900/90"
        >
          <div class="p-4">
            <SearchCheck class="size-5 text-emerald-300" />
            <p class="mt-3 text-xs text-zinc-400">선택 가능 Bay</p>
            <p class="mt-1 text-xl font-semibold tabular-nums">{{ props.bayCount }}</p>
          </div>
          <div class="p-4">
            <UserRoundCheck class="size-5 text-amber-300" />
            <p class="mt-3 text-xs text-zinc-400">상태 변경</p>
            <p class="mt-1 text-sm font-semibold">순방향 전용</p>
          </div>
          <div class="p-4">
            <ShieldCheck class="size-5 text-sky-300" />
            <p class="mt-3 text-xs text-zinc-400">안전 구분</p>
            <p class="mt-1 text-sm font-semibold">항상 표시</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
