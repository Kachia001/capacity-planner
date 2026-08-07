<script setup lang="ts">
import { AlertTriangle, Loader2, Send, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { OperationWorkItem, WorkItemIssueCategory } from '@/types/operations'

const props = defineProps<{
  item: OperationWorkItem
  bayCode: string
  pending: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  submit: [category: WorkItemIssueCategory, note: string]
  close: []
}>()

const category = ref<WorkItemIssueCategory>('material_shortage')
const note = ref('')
const noteLength = computed(() => note.value.trim().length)
const canSubmit = computed(() => !props.pending)

function close() {
  if (!props.pending) emit('close')
}
const auth = useAuthStore()
const globalAlert = useGlobalAlertStore()

async function submit() {
  if (auth.profile?.role === 'worker') {
    const accepted = await globalAlert.confirm({
      variant: 'warning',
      title: '이슈 등록 전 확인',
      message:
        'Worker가 등록한 이슈는 등록 후 내용과 상태를 직접 수정할 수 없습니다. 변경이 필요하면 Manager에게 요청해야 합니다.',
      confirmLabel: '확인하고 저장',
      cancelLabel: '취소',
    })

    if (!accepted) return
  }

  if (canSubmit.value) {
    emit('submit', category.value, note.value.trim())
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
        aria-labelledby="issue-report-title"
        aria-describedby="issue-report-description"
        class="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
        @click.stop
      >
        <div class="h-1.5 bg-red-500" />
        <Button
          type="button"
          variant="ghost"
          tone="neutral"
          size="icon-md"
          aria-label="이슈 등록 닫기"
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
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"
            >
              <AlertTriangle class="size-5" />
            </span>
            <div>
              <p class="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">
                Issue report
              </p>
              <h2 id="issue-report-title" class="mt-1 text-lg font-semibold text-zinc-950">
                작업 이슈 등록
              </h2>
              <p id="issue-report-description" class="mt-1 text-sm leading-6 text-zinc-600">
                카테고리와 내용을 입력하세요. 같은 작업에도 이슈를 여러 건 등록할 수 있습니다.
              </p>
            </div>
          </div>

          <dl class="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-zinc-200 text-xs">
            <div class="bg-zinc-50 px-3 py-3">
              <dt class="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">Bay</dt>
              <dd class="mt-1 break-all font-mono font-bold text-zinc-900">{{ props.bayCode }}</dd>
            </div>
            <div class="bg-zinc-50 px-3 py-3">
              <dt class="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                작업 ID
              </dt>
              <dd class="mt-1 font-mono font-bold text-zinc-900">#{{ props.item.id }}</dd>
            </div>
            <div class="col-span-2 bg-zinc-50 px-3 py-3">
              <dt class="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">작업</dt>
              <dd class="mt-1 font-semibold leading-5 text-zinc-900">
                {{ props.item.workName || '작업명 없음' }} ·
                {{ props.item.workDetail || '상세 작업 없음' }}
              </dd>
            </div>
          </dl>

          <label class="mt-5 grid gap-2 text-sm font-semibold text-zinc-800">
            카테고리
            <select
              v-model="category"
              class="h-12 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="material_shortage">자재부족</option>
              <option value="work_delay">작업지연</option>
              <option value="quality_issue">품질이슈</option>
              <option value="other">기타</option>
            </select>
          </label>

          <label class="mt-4 grid gap-2 text-sm font-semibold text-zinc-800">
            이슈 내용
            <textarea
              v-model="note"
              autofocus
              rows="5"
              maxlength="1000"
              class="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm font-normal leading-6 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="현장에서 확인한 문제와 필요한 조치를 구체적으로 입력하세요."
            />
            <span class="text-right text-xs font-normal text-zinc-500">
              {{ noteLength }}/1000자
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
            <Button type="submit" variant="solid" tone="danger" size="touch" :disabled="!canSubmit">
              <Loader2 v-if="props.pending" class="size-4 animate-spin" />
              <Send v-else class="size-4" />
              {{ props.pending ? '등록 중' : '이슈 등록 및 전송 예약' }}
            </Button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
