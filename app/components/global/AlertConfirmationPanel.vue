<script setup lang="ts">
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type {
  GlobalAlertDetail,
  GlobalAlertPromptOptions,
  GlobalAlertVariant,
} from '@/stores/global-alert'

const props = defineProps<{
  variant: GlobalAlertVariant
  title?: string
  message: string
  confirmLabel: string
  cancelLabel: string
  details: GlobalAlertDetail[]
  acknowledgementLabel?: string
  prompt?: GlobalAlertPromptOptions | null
}>()

const emit = defineEmits<{
  accept: [value: string]
  cancel: []
}>()

const acknowledged = ref(false)
const inputValue = ref('')

const variantPresentation = computed(() => {
  if (props.variant === 'destructive') {
    return {
      title: '주의가 필요합니다',
      icon: CircleAlert,
      iconClass: 'bg-red-100 text-red-700 ring-red-200',
      accentClass: 'bg-red-500',
      buttonVariant: 'destructive' as const,
    }
  }

  if (props.variant === 'warning') {
    return {
      title: '확인해 주세요',
      icon: AlertTriangle,
      iconClass: 'bg-amber-100 text-amber-700 ring-amber-200',
      accentClass: 'bg-amber-400',
      buttonVariant: 'default' as const,
    }
  }

  if (props.variant === 'success') {
    return {
      title: '진행할까요?',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
      accentClass: 'bg-emerald-500',
      buttonVariant: 'default' as const,
    }
  }

  return {
    title: '선택을 확인해 주세요',
    icon: Info,
    iconClass: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
    accentClass: 'bg-zinc-700',
    buttonVariant: 'default' as const,
  }
})

const visibleTitle = computed(() => props.title || variantPresentation.value.title)
const promptLength = computed(() => inputValue.value.trim().length)
const canAccept = computed(() => {
  if (props.acknowledgementLabel && !acknowledged.value) {
    return false
  }

  if (props.prompt && promptLength.value < (props.prompt.minLength ?? 1)) {
    return false
  }

  return true
})

function detailClass(detail: GlobalAlertDetail) {
  if (detail.tone === 'danger') {
    return 'border-red-200 bg-red-50 text-red-900'
  }

  if (detail.tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-950'
  }

  return 'border-zinc-200 bg-zinc-50 text-zinc-900'
}

function acceptAlert() {
  if (canAccept.value) {
    emit('accept', inputValue.value.trim())
  }
}

function cancelAlert() {
  emit('cancel')
}
</script>

<template>
  <section
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="global-alert-title"
    aria-describedby="global-alert-message"
    class="relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20"
    @click.stop
  >
    <div class="absolute inset-x-0 top-0 h-1" :class="variantPresentation.accentClass" />

    <button
      type="button"
      aria-label="알림 닫기"
      class="absolute right-4 top-4 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      @click="cancelAlert"
    >
      <X class="size-4" />
    </button>

    <div class="max-h-[85vh] overflow-y-auto px-6 pb-5 pt-7">
      <div class="flex items-start gap-4 pr-8">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-full ring-1"
          :class="variantPresentation.iconClass"
        >
          <component :is="variantPresentation.icon" class="size-5" />
        </div>

        <div class="min-w-0 pt-0.5">
          <h2 id="global-alert-title" class="text-base font-semibold tracking-tight text-zinc-950">
            {{ visibleTitle }}
          </h2>
          <p
            id="global-alert-message"
            class="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600"
          >
            {{ props.message }}
          </p>
        </div>
      </div>

      <dl v-if="props.details.length" class="mt-5 grid gap-2 sm:grid-cols-2">
        <div
          v-for="detail in props.details"
          :key="`${detail.label}-${detail.value}`"
          class="rounded-md border px-3 py-2.5"
          :class="detailClass(detail)"
        >
          <dt class="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">
            {{ detail.label }}
          </dt>
          <dd class="mt-1 break-words text-sm font-semibold">
            {{ detail.value }}
          </dd>
        </div>
      </dl>

      <div v-if="props.prompt" class="mt-5 grid gap-2 text-sm text-zinc-800">
        <label for="global-alert-prompt" class="font-semibold">
          {{ props.prompt.label }}
        </label>
        <textarea
          id="global-alert-prompt"
          v-model="inputValue"
          :maxlength="props.prompt.maxLength ?? 500"
          aria-describedby="global-alert-prompt-help global-alert-prompt-count"
          rows="3"
          class="resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          :placeholder="props.prompt.placeholder"
        />
        <span class="flex items-center justify-between gap-3 text-xs font-normal text-zinc-500">
          <span id="global-alert-prompt-help">최소 {{ props.prompt.minLength ?? 1 }}자</span>
          <span id="global-alert-prompt-count" aria-live="polite" aria-atomic="true">
            {{ promptLength }}/{{ props.prompt.maxLength ?? 500 }}자
          </span>
        </span>
      </div>

      <label
        v-if="props.acknowledgementLabel"
        class="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950"
      >
        <input
          v-model="acknowledged"
          type="checkbox"
          class="mt-0.5 size-4 rounded border-amber-400 accent-amber-600"
        />
        <span>{{ props.acknowledgementLabel }}</span>
      </label>

      <div class="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button autofocus variant="outline" @click="cancelAlert">{{ props.cancelLabel }}</Button>
        <Button
          :variant="variantPresentation.buttonVariant"
          :disabled="!canAccept"
          @click="acceptAlert"
        >
          {{ props.confirmLabel }}
        </Button>
      </div>
    </div>
  </section>
</template>
