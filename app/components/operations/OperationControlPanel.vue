<script setup lang="ts">
import { Clock3, LockKeyhole, Play, RefreshCw, Square } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { OperationStatus } from '@/types/operations'

const props = defineProps<{
  status: OperationStatus | null
  canManage: boolean
  pending: boolean
  mutationPending: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  open: [extensionMinutes?: number]
  close: []
  refresh: []
  expired: []
}>()

const extensionMinutes = ref(60)
const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined
let emittedExpirationFor: string | null = null

const effectivelyOpen = computed(() => {
  if (!props.status?.isOpen) return false
  if (!props.status.closesAt) return true
  return new Date(props.status.closesAt).getTime() > now.value
})

const statusLabel = computed(() => {
  if (!effectivelyOpen.value) return 'Close'
  return props.status?.mode === 'extension' ? '연장 Open' : 'Open'
})

const remainingLabel = computed(() => {
  const closesAt = props.status?.closesAt
  if (!effectivelyOpen.value || !closesAt) return null

  const remainingSeconds = Math.max(0, Math.ceil((new Date(closesAt).getTime() - now.value) / 1000))
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  return hours > 0
    ? `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(seconds).padStart(2, '0')}초`
    : `${minutes}분 ${String(seconds).padStart(2, '0')}초`
})

const closeTimeLabel = computed(() => {
  if (!props.status?.closesAt) return null
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(props.status.closesAt))
})

function requestOpen() {
  if (!props.status || props.status.isWithinRegularHours) {
    emit('open')
    return
  }

  const minutes = Math.min(1440, Math.max(1, Math.round(extensionMinutes.value || 0)))
  extensionMinutes.value = minutes
  emit('open', minutes)
}

watchEffect(() => {
  const closesAt = props.status?.closesAt ?? null

  if (
    props.status?.isOpen &&
    closesAt &&
    new Date(closesAt).getTime() <= now.value &&
    emittedExpirationFor !== closesAt
  ) {
    emittedExpirationFor = closesAt
    emit('expired')
  }
})

watch(
  () => props.status?.closesAt,
  () => {
    emittedExpirationFor = null
  },
)

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border bg-white shadow-[0_16px_48px_-42px_rgba(15,23,42,0.6)]"
    :class="effectivelyOpen ? 'border-emerald-200' : 'border-zinc-300'"
  >
    <div class="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full"
          :class="effectivelyOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-700'"
        >
          <Clock3 v-if="effectivelyOpen" class="size-5" />
          <LockKeyhole v-else class="size-5" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-zinc-950">작업 운영 상태</p>
            <span
              class="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold"
              :class="
                effectivelyOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
              "
            >
              {{ pending ? '확인 중' : statusLabel }}
            </span>
          </div>
          <p class="mt-1 text-sm leading-6 text-zinc-600">
            <template v-if="effectivelyOpen && remainingLabel">
              {{ closeTimeLabel }} 자동 Close · 남은 시간 {{ remainingLabel }}
            </template>
            <template v-else-if="status?.isWithinRegularHours">
              운영시간 내 수동 Close 상태입니다. 관리자가 다시 Open할 수 있습니다.
            </template>
            <template v-else>
              정규 운영시간은 08:20~17:20입니다. 시간 외 작업은 관리자 연장 Open이 필요합니다.
            </template>
          </p>
          <p v-if="errorMessage" class="mt-1 text-xs font-semibold text-red-700">
            {{ errorMessage }}
          </p>
        </div>
      </div>

      <div v-if="canManage" class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <label
          v-if="!effectivelyOpen && status && !status.isWithinRegularHours"
          class="flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3"
        >
          <span class="text-xs font-semibold text-zinc-600">연장</span>
          <input
            v-model.number="extensionMinutes"
            type="number"
            min="1"
            max="1440"
            class="w-16 bg-transparent text-right text-sm font-bold text-zinc-950 outline-none"
          />
          <span class="text-xs text-zinc-500">분</span>
        </label>
        <Button
          v-if="effectivelyOpen"
          variant="solid"
          tone="neutral"
          size="md"
          :loading="mutationPending"
          loading-text="지금 Close"
          :disabled="mutationPending"
          @click="emit('close')"
        >
          <Square class="size-3.5 fill-current" /> 지금 Close
        </Button>
        <Button
          v-else
          variant="solid"
          tone="success"
          size="md"
          :loading="mutationPending"
          :loading-text="status?.isWithinRegularHours ? '운영 Open' : '연장 Open'"
          :disabled="pending || mutationPending || !status"
          @click="requestOpen"
        >
          <Play class="size-4 fill-current" />
          {{ status?.isWithinRegularHours ? '운영 Open' : '연장 Open' }}
        </Button>
        <Button
          variant="outline"
          tone="neutral"
          size="icon-md"
          :loading="pending"
          :disabled="mutationPending"
          aria-label="운영 상태 새로고침"
          tooltip="운영 상태 새로고침"
          :disabled-reason="
            mutationPending ? '운영 상태 변경이 끝난 뒤 새로고침할 수 있습니다' : undefined
          "
          @click="emit('refresh')"
        >
          <RefreshCw />
        </Button>
      </div>
    </div>
  </section>
</template>
