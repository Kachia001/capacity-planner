<script setup lang="ts">
import { ArrowLeft, ArrowRight, ClipboardCheck, Clock3 } from '@lucide/vue'
import type { TemplateMode } from '@/types/template'
defineProps<{ currentStep: number; templateMode: TemplateMode | null }>()
defineEmits<{ previous: []; next: []; submit: [] }>()
</script>
<template>
  <footer class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-300 bg-[#f8faf7]/95 shadow-[0_-16px_50px_-38px_rgba(15,23,42,0.55)] backdrop-blur">
    <div class="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <p class="hidden items-center gap-2 text-xs text-zinc-500 sm:flex"><Clock3 class="size-4" /> 입력 내용은 브라우저 초안에 자동 저장됩니다.</p>
      <nav class="ml-auto flex w-full items-center gap-2 sm:w-auto" aria-label="마법사 단계 이동">
        <button type="button" :disabled="currentStep === 1" class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none" @click="$emit('previous')"><ArrowLeft class="size-4" /> 이전</button>
        <button v-if="currentStep < 4" type="button" class="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-sm bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:flex-none" @click="$emit('next')">다음 단계 <ArrowRight class="size-4" /></button>
        <button v-else type="button" class="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-sm bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:flex-none" @click="$emit('submit')"><ClipboardCheck class="size-4" />BAY 생성</button>
      </nav>
    </div>
  </footer>
</template>
