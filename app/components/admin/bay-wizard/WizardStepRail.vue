<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { BayWizardStep } from '@/types/template'

const props = defineProps<{ steps: BayWizardStep[]; currentStep: number; furthestStep: number }>()
const emit = defineEmits<{ select: [step: number] }>()

function handleStepSelect(step: number) {
  emit('select', step)
}
</script>

<template>
  <nav class="overflow-hidden rounded-md border border-zinc-300 bg-[#f7f9f6] shadow-sm" aria-label="BAY 생성 진행 상황">
    <div class="flex items-center justify-between gap-4 border-b border-zinc-300 px-4 py-3 sm:px-5">
      <div class="flex items-center gap-3">
        <p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Commissioning process</p>
        <span class="hidden h-3 w-px bg-zinc-300 sm:block" />
        <p class="hidden text-xs text-zinc-500 sm:block">BAY 생성 단계</p>
      </div>
      <p class="font-mono text-[10px] font-semibold text-zinc-500">
        {{ props.currentStep }} / {{ props.steps.length }}
      </p>
    </div>

    <ol class="grid grid-cols-4">
      <li v-for="step in props.steps" :key="step.number" class="relative min-w-0 border-r border-zinc-200 last:border-r-0">
        <button
          type="button"
          class="group flex h-full min-h-[4.75rem] w-full items-center gap-2.5 px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 sm:gap-3 sm:px-4"
          :class="step.number === props.currentStep
            ? 'bg-zinc-950 text-white'
            : step.number <= props.furthestStep
              ? 'text-zinc-800 hover:bg-white'
              : 'cursor-not-allowed text-zinc-400'"
          :disabled="step.number > props.furthestStep"
          :aria-current="step.number === props.currentStep ? 'step' : undefined"
          @click="handleStepSelect(step.number)"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] font-bold"
            :class="step.number === props.currentStep
              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
              : step.number < props.currentStep
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-zinc-300 bg-white text-zinc-500'"
          >
            <Check v-if="step.number < props.currentStep" class="size-4" />
            <template v-else>{{ String(step.number).padStart(2, '0') }}</template>
          </span>
          <span class="min-w-0">
            <span class="hidden font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-60 md:block">{{ step.eyebrow }}</span>
            <span class="block truncate text-[11px] font-semibold sm:text-sm">{{ step.label }}</span>
            <span class="mt-0.5 hidden truncate text-[11px] opacity-60 xl:block">{{ step.description }}</span>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>
