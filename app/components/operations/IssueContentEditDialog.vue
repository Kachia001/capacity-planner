<script setup lang="ts">
import { Loader2, Pencil, Save, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { OperationWorkItemIssue } from '@/types/operations'

const props = defineProps<{
  issue: OperationWorkItemIssue
  pending: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  submit: [note: string]
  close: []
}>()

const note = ref(props.issue.note)
const noteLength = computed(() => note.value.trim().length)
const canSubmit = computed(
  () => noteLength.value >= 3 && note.value.trim() !== props.issue.note && !props.pending,
)

function close() {
  if (!props.pending) emit('close')
}

function submit() {
  if (canSubmit.value) {
    emit('submit', note.value.trim())
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[90] flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      @click.self="close"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-content-edit-title"
        aria-describedby="issue-content-edit-description"
        class="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
        @click.stop
      >
        <div class="h-1.5 bg-emerald-600" />
        <Button
          type="button"
          variant="ghost"
          tone="neutral"
          size="icon-md"
          aria-label="이슈 내용 수정 닫기"
          class="absolute right-4 top-5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
          :disabled="props.pending"
          @click="close"
        >
          <X class="size-5" />
        </Button>

        <form
          class="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6"
          @submit.prevent="submit"
        >
          <div class="flex items-start gap-3 pr-12">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"
            >
              <Pencil class="size-5" />
            </span>
            <div>
              <p
                class="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700"
              >
                Issue #{{ props.issue.id }}
              </p>
              <h2 id="issue-content-edit-title" class="mt-1 text-lg font-semibold text-zinc-950">
                이슈 내용 수정
              </h2>
              <p id="issue-content-edit-description" class="mt-1 text-sm leading-6 text-zinc-600">
                Manager와 Admin만 등록된 이슈 내용을 수정할 수 있습니다.
              </p>
            </div>
          </div>

          <label class="mt-5 grid gap-2 text-sm font-semibold text-zinc-800">
            이슈 내용
            <textarea
              v-model="note"
              autofocus
              rows="6"
              maxlength="1000"
              class="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-normal leading-6 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <span class="flex justify-between text-xs font-normal text-zinc-500">
              <span>최소 3자 · 기존 내용과 달라야 저장할 수 있습니다.</span>
              <span>{{ noteLength }}/1000자</span>
            </span>
          </label>

          <p
            v-if="props.errorMessage"
            role="alert"
            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-800"
          >
            {{ props.errorMessage }}
          </p>

          <div class="mt-6 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-4">
            <Button
              type="button"
              variant="outline"
              size="touch"
              :disabled="props.pending"
              @click="close"
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="solid"
              tone="success"
              size="touch"
              :disabled="!canSubmit"
            >
              <Loader2 v-if="props.pending" class="size-4 animate-spin" />
              <Save v-else class="size-4" />
              {{ props.pending ? '저장 중' : '내용 저장' }}
            </Button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
