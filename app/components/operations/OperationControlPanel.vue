<script setup lang="ts">
import { Clock3, LockKeyhole, Play, RefreshCw, Square } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { Button } from '@/components/ui/button'
import type { OperationOpenRequest, OperationStatus } from '@/types/operations'

const props = defineProps<{
  status: OperationStatus | null
  canManage: boolean
  pending: boolean
  mutationPending: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  open: [request?: OperationOpenRequest]
  close: []
  refresh: []
  expired: []
}>()

type ExtensionOption = '30' | '60' | 'custom'

const selectedExtension = ref<ExtensionOption>('60')
const customExtensionDate = ref('')
const customExtensionHour = ref('')
const customExtensionMinute = ref('')
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

const showsExtensionControls = computed(() => Boolean(props.status))

const extensionBaseEnd = computed(() => {
  if (!props.status) return null

  const closesAt = props.status.closesAt ? new Date(props.status.closesAt).getTime() : 0
  const regularClosesAt = props.status.isWithinRegularHours
    ? new Date(props.status.regularClosesAt).getTime()
    : 0
  const baseEnd = Math.max(now.value, closesAt, regularClosesAt)

  return Number.isFinite(baseEnd) ? baseEnd : now.value
})

const hasScheduledExtension = computed(() => {
  if (!props.status?.isWithinRegularHours || !props.status.closesAt) return false

  return (
    new Date(props.status.closesAt).getTime() > new Date(props.status.regularClosesAt).getTime()
  )
})

const extensionActionLabel = computed(() => {
  if (props.status?.mode === 'extension' || hasScheduledExtension.value) return '시간 추가'
  return props.status?.isWithinRegularHours ? '연장 예약' : '연장 Open'
})

function formatSeoulDateTimeLocal(timestamp: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(timestamp))
      .map(part => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

const customExtensionUntil = computed(() => {
  if (
    !customExtensionDate.value ||
    customExtensionHour.value === '' ||
    customExtensionMinute.value === ''
  ) {
    return ''
  }

  const hour = String(customExtensionHour.value).padStart(2, '0')
  const minute = String(customExtensionMinute.value).padStart(2, '0')
  return `${customExtensionDate.value}T${hour}:${minute}`
})

function parseSeoulDateTimeLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null

  const hour = Number(value.slice(11, 13))
  const minute = Number(value.slice(14, 16))
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  const parsed = new Date(`${value}:00+09:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const customExtensionDateMin = computed(() => formatSeoulDateTimeLocal(now.value).slice(0, 10))

const customExtensionDateMax = computed(() =>
  formatSeoulDateTimeLocal(now.value + 24 * 60 * 60 * 1000).slice(0, 10),
)

const customExtensionError = computed(() => {
  if (selectedExtension.value !== 'custom') return null

  const selected = parseSeoulDateTimeLocal(customExtensionUntil.value)
  if (!selected) return '작업이 끝날 시각을 선택해 주세요.'
  if (extensionBaseEnd.value && selected.getTime() <= extensionBaseEnd.value) {
    return props.status?.isWithinRegularHours
      ? '정규 운영 종료 시각보다 이후로 선택해 주세요.'
      : '현재 연장 종료 시각보다 이후로 선택해 주세요.'
  }
  if (selected.getTime() > now.value + 24 * 60 * 60 * 1000) {
    return '종료 시각은 현재부터 24시간 이내로 선택해 주세요.'
  }

  return null
})

const canRequestOpen = computed(
  () =>
    Boolean(props.status) &&
    !props.pending &&
    !props.mutationPending &&
    (!showsExtensionControls.value || !customExtensionError.value),
)

function selectExtension(option: ExtensionOption) {
  selectedExtension.value = option

  if (option === 'custom' && customExtensionError.value) {
    const extensionBase = extensionBaseEnd.value ?? now.value
    const defaultUntil = Math.ceil((extensionBase + 60 * 60 * 1000) / 60_000) * 60_000
    const [date, time] = formatSeoulDateTimeLocal(defaultUntil).split('T')
    const [hour, minute] = time!.split(':')

    customExtensionDate.value = date!
    customExtensionHour.value = hour!
    customExtensionMinute.value = minute!
  }
}

function requestOpen() {
  if (!props.status) return

  if (selectedExtension.value === 'custom') {
    const extensionUntil = parseSeoulDateTimeLocal(customExtensionUntil.value)
    if (!extensionUntil || customExtensionError.value) return

    emit('open', { extensionUntil: extensionUntil.toISOString() })
    return
  }

  emit('open', { extensionMinutes: Number(selectedExtension.value) })
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

      <div v-if="canManage" class="flex shrink-0 flex-col gap-3">
        <div v-if="showsExtensionControls" class="grid gap-2">
          <div class="grid grid-cols-3 gap-2" role="group" aria-label="작업 연장 방식">
            <Button
              v-for="option in ['30', '60', 'custom'] as ExtensionOption[]"
              :key="option"
              type="button"
              :variant="selectedExtension === option ? 'solid' : 'outline'"
              tone="success"
              size="sm"
              class="text-xs"
              :aria-pressed="selectedExtension === option"
              :disabled="mutationPending"
              @click="selectExtension(option)"
            >
              {{ option === 'custom' ? '직접 입력' : `${option}분` }}
            </Button>
          </div>

          <div
            v-if="selectedExtension === 'custom'"
            class="grid gap-1 rounded-lg border border-zinc-300 bg-zinc-50 p-3"
          >
            <span class="mb-1 text-xs font-semibold text-zinc-700">종료 시각 (한국시간)</span>
            <div class="grid grid-cols-[minmax(0,1fr)_4.25rem_4.25rem] gap-2">
              <label class="grid min-w-0 gap-1">
                <span class="text-[11px] font-semibold text-zinc-600">날짜</span>
                <input
                  v-model="customExtensionDate"
                  type="date"
                  aria-label="종료 날짜"
                  :min="customExtensionDateMin"
                  :max="customExtensionDateMax"
                  class="h-10 min-w-0 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label class="grid gap-1">
                <span class="text-center text-[11px] font-semibold text-zinc-600">시</span>
                <input
                  v-model="customExtensionHour"
                  type="number"
                  inputmode="numeric"
                  aria-label="종료 시"
                  min="0"
                  max="23"
                  placeholder="00"
                  class="h-10 min-w-0 rounded-md border border-zinc-300 bg-white px-1 text-center text-sm font-semibold text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label class="grid gap-1">
                <span class="text-center text-[11px] font-semibold text-zinc-600">분</span>
                <input
                  v-model="customExtensionMinute"
                  type="number"
                  inputmode="numeric"
                  aria-label="종료 분"
                  min="0"
                  max="59"
                  placeholder="00"
                  class="h-10 min-w-0 rounded-md border border-zinc-300 bg-white px-1 text-center text-sm font-semibold text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
            <span v-if="customExtensionError" class="text-[11px] font-medium text-red-700">
              {{ customExtensionError }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2">
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
            v-if="showsExtensionControls"
            variant="solid"
            tone="success"
            size="md"
            :loading="mutationPending"
            :loading-text="extensionActionLabel"
            :disabled="!canRequestOpen"
            :disabled-reason="customExtensionError ?? undefined"
            @click="requestOpen"
          >
            <Play class="size-4 fill-current" />
            {{ extensionActionLabel }}
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
    </div>
  </section>
</template>
