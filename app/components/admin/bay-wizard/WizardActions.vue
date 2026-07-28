<script setup lang="ts">
import { ArrowLeft, ArrowRight, ClipboardCheck, Clock3 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { TemplateMode } from '@/types/template'

const props = defineProps<{ currentStep: number; templateMode: TemplateMode | null }>()
const emit = defineEmits<{ previous: []; next: []; submit: [] }>()

function handlePrevious() {
  emit('previous')
}

function handleNext() {
  emit('next')
}

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <footer
    class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-300 bg-[#f8faf7]/95 shadow-[0_-16px_50px_-38px_rgba(15,23,42,0.55)] backdrop-blur"
  >
    <div data-layout="mobile" class="mx-auto flex w-full max-w-[92rem] px-4 py-3 sm:hidden">
      <nav class="flex w-full items-center gap-2" aria-label="모바일 마법사 단계 이동">
        <Button
          variant="outline"
          tone="neutral"
          size="touch"
          shape="compact"
          :disabled="props.currentStep === 1"
          class="flex-1"
          @click="handlePrevious"
        >
          <ArrowLeft /> 이전
        </Button>
        <Button
          v-if="props.currentStep < 4"
          variant="solid"
          tone="success"
          size="touch"
          shape="compact"
          class="flex-[2]"
          @click="handleNext"
        >
          다음 단계 <ArrowRight />
        </Button>
        <Button
          v-else
          variant="solid"
          tone="neutral"
          size="touch"
          shape="compact"
          class="flex-[2]"
          @click="handleSubmit"
        >
          <ClipboardCheck />BAY 생성
        </Button>
      </nav>
    </div>

    <div
      data-layout="desktop"
      class="mx-auto hidden w-full max-w-[92rem] items-center justify-between gap-3 px-8 py-3 sm:flex"
    >
      <p class="flex items-center gap-2 text-xs text-zinc-500">
        <Clock3 class="size-4" /> 입력 내용은 브라우저 초안에 자동 저장됩니다.
      </p>
      <nav class="ml-auto flex items-center gap-2" aria-label="데스크톱 마법사 단계 이동">
        <Button
          variant="outline"
          tone="neutral"
          size="md"
          shape="compact"
          :disabled="props.currentStep === 1"
          @click="handlePrevious"
        >
          <ArrowLeft /> 이전
        </Button>
        <Button
          v-if="props.currentStep < 4"
          variant="solid"
          tone="success"
          size="md"
          shape="compact"
          @click="handleNext"
        >
          다음 단계 <ArrowRight />
        </Button>
        <Button
          v-else
          variant="solid"
          tone="neutral"
          size="md"
          shape="compact"
          @click="handleSubmit"
        >
          <ClipboardCheck />BAY 생성
        </Button>
      </nav>
    </div>
  </footer>
</template>
