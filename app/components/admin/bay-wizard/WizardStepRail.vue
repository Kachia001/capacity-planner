<script setup lang="ts">
import { Check, ShieldCheck } from '@lucide/vue'
import type { BayWizardStep } from '@/types/template'

defineProps<{ steps: BayWizardStep[]; currentStep: number; furthestStep: number }>()
defineEmits<{ select: [step: number] }>()
</script>

<template>
  <aside class="self-start rounded-md border border-zinc-300 bg-[#f7f9f6] shadow-sm xl:sticky xl:top-5">
    <header class="border-b border-zinc-300 px-4 py-4"><p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Process rail</p><h2 class="mt-1 text-sm font-semibold">BAY 생성 단계</h2></header>
    <ol aria-label="BAY 생성 단계" class="grid grid-cols-4 xl:grid-cols-1">
      <li v-for="step in steps" :key="step.number" class="border-r border-zinc-200 last:border-r-0 xl:border-b xl:border-r-0 xl:last:border-b-0">
        <button type="button" class="group flex h-full w-full flex-col gap-2 px-3 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 xl:flex-row xl:items-start xl:gap-3 xl:px-4" :class="step.number === currentStep ? 'bg-zinc-950 text-white' : step.number <= furthestStep ? 'text-zinc-800 hover:bg-white' : 'cursor-not-allowed text-zinc-400'" :disabled="step.number > furthestStep" :aria-current="step.number === currentStep ? 'step' : undefined" @click="$emit('select', step.number)">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] font-bold" :class="step.number === currentStep ? 'border-emerald-400 text-emerald-300' : step.number < currentStep ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-300 bg-white text-zinc-500'"><Check v-if="step.number < currentStep" class="size-4" /><template v-else>{{ String(step.number).padStart(2, '0') }}</template></span>
          <span class="min-w-0"><span class="hidden font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-60 xl:block">{{ step.eyebrow }}</span><span class="mt-0.5 block text-xs font-semibold sm:text-sm">{{ step.label }}</span><span class="mt-1 hidden text-xs leading-5 opacity-60 xl:block">{{ step.description }}</span></span>
        </button>
      </li>
    </ol>
    <p class="m-4 hidden items-start gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950 xl:flex"><ShieldCheck class="mt-0.5 size-4 shrink-0" />선택한 템플릿 버전은 생성 시점에 고정됩니다.</p>
  </aside>
</template>
