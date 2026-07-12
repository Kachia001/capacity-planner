<script setup lang="ts">
import { ArrowLeft, Save, TriangleAlert } from '@lucide/vue'
import type { DraftSaveState } from '@/types/template'

interface Props {
  currentStep: number
  groupCount: number
  itemCount: number
  saveState: DraftSaveState
  savedAt: string | null
}

defineProps<Props>()
</script>

<template>
  <header class="border-b border-zinc-300 bg-[#f8faf7]">
    <div class="mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <nav class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" aria-label="페이지 이동">
        <NuxtLink to="/" class="inline-flex w-fit items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
          <ArrowLeft class="size-4" /> Dashboard
        </NuxtLink>
        <p class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-900"><TriangleAlert class="size-3.5" /> Frontend preview · DB 저장 없음</span>
          <span class="inline-flex items-center gap-2 rounded-sm border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"><Save class="size-3.5" />{{ saveState === 'saving' ? '초안 저장 중' : savedAt ? `초안 저장됨 ${savedAt}` : '자동 초안 저장' }}</span>
        </p>
      </nav>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700">Bay commissioning / admin console</p>
          <h1 class="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-4xl">새 BAY에 작업 구조를 배정합니다.</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">기존 템플릿을 고정하거나, workName 그룹과 상세 작업을 새로 구성해 운영 단위를 준비하세요.</p>
        </div>
        <dl class="grid grid-cols-3 overflow-hidden rounded-sm border border-zinc-300 bg-white shadow-sm">
          <div v-for="metric in [{ label: 'Step', value: `${String(currentStep).padStart(2, '0')}/04` }, { label: 'Groups', value: groupCount }, { label: 'Items', value: itemCount }]" :key="metric.label" class="border-r border-zinc-200 px-4 py-3 last:border-r-0">
            <dt class="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{{ metric.label }}</dt><dd class="mt-1 text-lg font-semibold">{{ metric.value }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </header>
</template>
