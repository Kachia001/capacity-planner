<script setup lang="ts">
import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleOff,
  Layers3,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
  UserRound,
} from '@lucide/vue'
import HighAltitudeBadge from '@/components/operations/HighAltitudeBadge.vue'
import WorkStatusBadge from '@/components/operations/WorkStatusBadge.vue'
import { Button } from '@/components/ui/button'
import type { AppRole } from '@/stores/auth'
import type { CompletedWorkItemRestoreTarget, OperationWorkItem } from '@/types/operations'

interface WorkItemGroup {
  key: string
  domId: string
  label: string
  workNo: number | null
  items: OperationWorkItem[]
  notStarted: number
  inProgress: number
  completed: number
  openIssues: number
  highAltitude: number
  completionRate: number
}

const props = defineProps<{
  role: AppRole
  currentUserId: string
  items: OperationWorkItem[]
  mutationItemId: number | null
  focusedWorkItemId: number | null
}>()

const emit = defineEmits<{
  start: [item: OperationWorkItem]
  complete: [item: OperationWorkItem]
  cancelStart: [item: OperationWorkItem]
  restoreCompleted: [item: OperationWorkItem, targetStatus: CompletedWorkItemRestoreTarget]
  void: [item: OperationWorkItem]
}>()

const expandedGroupKeys = ref<string[]>([])
const isSupervisor = computed(() => props.role === 'admin' || props.role === 'manager')

const workGroups = computed<WorkItemGroup[]>(() => {
  const groupedItems = new Map<string, { label: string; items: OperationWorkItem[] }>()

  for (const item of props.items) {
    const label = item.workName?.trim() || '작업명 없음'
    const key = label.toLocaleLowerCase()
    const existing = groupedItems.get(key)

    if (existing) {
      existing.items.push(item)
    } else {
      groupedItems.set(key, { label, items: [item] })
    }
  }

  return [...groupedItems.entries()]
    .map(([key, group]) => {
      const items = [...group.items].sort((first, second) => first.sortOrder - second.sortOrder)
      const completed = items.filter(item => item.status === 'completed').length

      return {
        key,
        domId: `work-group-${items[0]?.id ?? 'empty'}`,
        label: group.label,
        workNo: items.find(item => item.workNo !== null)?.workNo ?? null,
        items,
        notStarted: items.filter(item => item.status === 'not_started').length,
        inProgress: items.filter(item => item.status === 'in_progress').length,
        completed,
        openIssues: items.filter(item => item.hasIssue && item.issueStatus !== 'resolved').length,
        highAltitude: items.filter(item => item.isHighAltitude).length,
        completionRate: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
      }
    })
    .sort(
      (first, second) =>
        (first.items[0]?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (second.items[0]?.sortOrder ?? Number.MAX_SAFE_INTEGER),
    )
})

watch(
  [() => props.focusedWorkItemId, () => props.items],
  () => {
    const validKeys = new Set(workGroups.value.map(group => group.key))
    const nextExpandedKeys = expandedGroupKeys.value.filter(key => validKeys.has(key))
    const focusedGroup = workGroups.value.find(group =>
      group.items.some(item => item.id === props.focusedWorkItemId),
    )

    if (focusedGroup && !nextExpandedKeys.includes(focusedGroup.key)) {
      nextExpandedKeys.push(focusedGroup.key)
    }

    expandedGroupKeys.value = nextExpandedKeys
  },
  { immediate: true, flush: 'post' },
)

function isExpanded(groupKey: string) {
  return expandedGroupKeys.value.includes(groupKey)
}

function toggleGroup(groupKey: string) {
  expandedGroupKeys.value = isExpanded(groupKey)
    ? expandedGroupKeys.value.filter(key => key !== groupKey)
    : [...expandedGroupKeys.value, groupKey]
}

function segmentWidth(value: number, total: number) {
  return total > 0 ? `${(value / total) * 100}%` : '0%'
}

function displayValue(value: string | number | null | undefined, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function formatDateTime(value: string | null) {
  if (!value) return '기록 없음'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function workerLabel(item: OperationWorkItem) {
  return item.startedByName || item.worker || item.startedByEmail || '담당자 미확인'
}

function severityLabel(item: OperationWorkItem) {
  if (item.issueSeverity === 'critical') return '긴급 이슈'
  if (item.issueSeverity === 'high') return '중요 이슈'
  if (item.issueSeverity === 'low') return '경미 이슈'
  return '이슈 있음'
}

function canComplete(item: OperationWorkItem) {
  return isSupervisor.value || item.startedBy === props.currentUserId
}

function requestStart(item: OperationWorkItem) {
  emit('start', item)
}

function requestComplete(item: OperationWorkItem) {
  emit('complete', item)
}

function requestCancelStart(item: OperationWorkItem) {
  emit('cancelStart', item)
}

function requestRestoreCompleted(
  item: OperationWorkItem,
  targetStatus: CompletedWorkItemRestoreTarget,
) {
  emit('restoreCompleted', item, targetStatus)
}

function requestVoid(item: OperationWorkItem) {
  emit('void', item)
}
</script>

<template>
  <div class="space-y-3">
    <article
      v-for="(group, groupIndex) in workGroups"
      :key="group.key"
      class="overflow-hidden rounded-2xl border bg-white shadow-[0_10px_32px_rgba(31,41,33,0.06)] transition"
      :class="[
        group.openIssues > 0
          ? 'border-red-200'
          : group.highAltitude > 0
            ? 'border-amber-200'
            : 'border-[#dce2da]',
        isExpanded(group.key) ? 'ring-2 ring-[#dcebcf]' : '',
      ]"
    >
      <button
        :id="`${group.domId}-trigger`"
        type="button"
        class="w-full px-4 py-4 text-left outline-none transition active:bg-[#f4f7f1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#739354]"
        :aria-expanded="isExpanded(group.key)"
        :aria-controls="group.domId"
        @click="toggleGroup(group.key)"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eff4eb] text-[#526b42]"
          >
            <Layers3 class="size-[18px]" />
          </span>

          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                class="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#8a9386]"
              >
                Work {{ String(groupIndex + 1).padStart(2, '0') }}
              </span>
              <span v-if="group.workNo !== null" class="text-[11px] font-semibold text-[#6d7868]">
                No. {{ group.workNo }}
              </span>
            </span>
            <strong
              class="mt-1.5 block text-[17px] font-semibold leading-6 tracking-[-0.025em] text-[#182017]"
            >
              {{ group.label }}
            </strong>
            <span class="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                class="inline-flex h-6 items-center rounded-full bg-[#edf2e9] px-2.5 text-[10px] font-bold text-[#53634b]"
              >
                세부 {{ group.items.length }}건
              </span>
              <span
                v-if="group.inProgress > 0"
                class="inline-flex h-6 items-center rounded-full bg-amber-100 px-2.5 text-[10px] font-bold text-amber-800"
              >
                세부 작업 중 {{ group.inProgress }}
              </span>
              <span
                v-if="group.openIssues > 0"
                class="inline-flex h-6 items-center gap-1 rounded-full bg-red-100 px-2.5 text-[10px] font-bold text-red-800"
              >
                <AlertCircle class="size-3" /> 이슈 {{ group.openIssues }}
              </span>
              <HighAltitudeBadge :active="group.highAltitude > 0" compact />
            </span>
          </span>

          <span class="flex shrink-0 flex-col items-end gap-2">
            <strong class="font-mono text-lg tabular-nums text-[#293328]">
              {{ group.completionRate }}%
            </strong>
            <span
              class="flex size-8 items-center justify-center rounded-full border border-[#dce2da] bg-[#fafbf9] text-[#687165]"
            >
              <ChevronDown
                class="size-4 transition-transform duration-200"
                :class="isExpanded(group.key) ? 'rotate-180' : ''"
              />
            </span>
          </span>
        </div>

        <span class="mt-4 block">
          <span class="flex h-2 overflow-hidden rounded-full bg-[#edf0eb]">
            <span
              class="bg-emerald-500 transition-[width] duration-300 ease-out"
              :style="{ width: segmentWidth(group.completed, group.items.length) }"
            />
            <span
              class="bg-amber-400 transition-[width] duration-300 ease-out"
              :style="{ width: segmentWidth(group.inProgress, group.items.length) }"
            />
            <span
              class="bg-[#cfd5cd] transition-[width] duration-300 ease-out"
              :style="{ width: segmentWidth(group.notStarted, group.items.length) }"
            />
          </span>
          <span class="mt-2 flex items-center gap-3 text-[10px] font-semibold text-[#7b8378]">
            <span class="text-emerald-700">완료 {{ group.completed }}</span>
            <span class="text-amber-700">진행 {{ group.inProgress }}</span>
            <span>세부 대기 {{ group.notStarted }}</span>
            <span class="ml-auto">{{ isExpanded(group.key) ? '접기' : '세부 작업 보기' }}</span>
          </span>
        </span>
      </button>

      <Transition name="work-accordion">
        <div
          v-if="isExpanded(group.key)"
          :id="group.domId"
          role="region"
          :aria-labelledby="`${group.domId}-trigger`"
          class="border-t border-[#dfe4dd] bg-[#f6f8f4]"
        >
          <p
            class="border-b border-[#dfe4dd] bg-[#eef3e9] px-4 py-2.5 text-[11px] font-semibold text-[#596653]"
          >
            상태 변경은 선택한 workDetail 1건에만 적용됩니다.
          </p>
          <div class="divide-y divide-[#dfe4dd]">
            <article
              v-for="item in group.items"
              :id="`work-item-${item.id}`"
              :key="item.id"
              tabindex="-1"
              class="scroll-mt-24 px-4 py-5 outline-none transition"
              :class="
                props.focusedWorkItemId === item.id
                  ? 'bg-sky-50 ring-2 ring-inset ring-sky-400'
                  : 'bg-white/70'
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p
                    class="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#899187]"
                  >
                    Detail {{ String(item.sortOrder).padStart(3, '0') }} · #{{ item.id }}
                  </p>
                  <h4 class="mt-1.5 text-[15px] font-semibold leading-6 text-[#1b211a]">
                    {{ displayValue(item.workDetail, '상세 작업 내용이 없습니다.') }}
                  </h4>
                </div>
                <WorkStatusBadge :status="item.status" />
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-1.5">
                <HighAltitudeBadge :active="item.isHighAltitude" compact />
                <span
                  v-if="item.hasIssue && item.issueStatus !== 'resolved'"
                  class="inline-flex h-6 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 text-[10px] font-bold text-red-800"
                >
                  <AlertCircle class="size-3" /> {{ severityLabel(item) }}
                </span>
              </div>

              <dl
                class="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#dfe4dd] text-xs"
              >
                <div class="bg-white px-3 py-3">
                  <dt class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#92998f]">
                    품번
                  </dt>
                  <dd class="mt-1 break-all font-mono font-semibold text-[#313831]">
                    {{ displayValue(item.partNo) }}
                  </dd>
                </div>
                <div class="bg-white px-3 py-3">
                  <dt class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#92998f]">
                    품명
                  </dt>
                  <dd class="mt-1 font-semibold text-[#313831]">
                    {{ displayValue(item.itemName) }}
                  </dd>
                </div>
                <div class="col-span-2 bg-white px-3 py-3">
                  <dt class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#92998f]">
                    업체
                  </dt>
                  <dd class="mt-1 font-semibold text-[#313831]">
                    {{ displayValue(item.vendor) }}
                  </dd>
                </div>
              </dl>

              <div
                v-if="item.isHighAltitude"
                class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950"
              >
                <p class="flex items-center gap-2 font-bold">
                  <ShieldAlert class="size-4" /> 고소작업 안전 참고
                </p>
                <p class="mt-1.5 leading-5 text-amber-900/80">
                  {{
                    displayValue(
                      item.safetyNote,
                      '별도 참고사항 없음 · 현장 안전수칙을 확인하세요.',
                    )
                  }}
                </p>
              </div>

              <div
                v-if="item.hasIssue && item.issueNote"
                class="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-900"
              >
                <p class="font-bold">이슈 내용</p>
                <p class="mt-1 leading-5">{{ item.issueNote }}</p>
              </div>

              <div
                v-if="item.status !== 'not_started'"
                class="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#edf0eb] px-3 py-2.5 text-[11px] text-[#667063]"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <UserRound class="size-4 shrink-0" />
                  <strong class="truncate font-semibold text-[#2c332b]">{{
                    workerLabel(item)
                  }}</strong>
                </span>
                <span class="shrink-0 font-mono">{{ formatDateTime(item.startedAt) }}</span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <Button
                  v-if="props.role === 'admin'"
                  variant="destructive"
                  class="h-12 min-w-24 flex-1 px-3"
                  :disabled="props.mutationItemId !== null"
                  @click="requestVoid(item)"
                >
                  <CircleOff class="size-4" /> 무효화
                </Button>
                <Button
                  v-if="isSupervisor && item.status === 'in_progress'"
                  variant="outline"
                  class="h-12 min-w-28 flex-1 border-amber-300 bg-white px-3 text-amber-800 hover:bg-amber-50"
                  :disabled="props.mutationItemId !== null"
                  @click="requestCancelStart(item)"
                >
                  <RotateCcw class="size-4" /> 세부 시작 취소
                </Button>
                <div
                  v-if="props.role === 'manager' && item.status === 'completed'"
                  class="w-full rounded-xl border border-sky-200 bg-sky-50/80 p-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                        완료 상태 조정
                      </p>
                      <p class="mt-1 text-xs leading-5 text-sky-950">
                        사유를 기록하고 이 세부 작업만 다시 활성화합니다.
                      </p>
                    </div>
                    <Loader2
                      v-if="props.mutationItemId === item.id"
                      class="size-4 shrink-0 animate-spin text-sky-600"
                    />
                    <RotateCcw v-else class="size-4 shrink-0 text-sky-600" />
                  </div>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      class="h-11 border-amber-300 bg-white px-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
                      :disabled="props.mutationItemId !== null"
                      @click="requestRestoreCompleted(item, 'in_progress')"
                    >
                      <Play class="size-4" /> 작업 중으로
                    </Button>
                    <Button
                      variant="outline"
                      class="h-11 border-zinc-300 bg-white px-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                      :disabled="props.mutationItemId !== null"
                      @click="requestRestoreCompleted(item, 'not_started')"
                    >
                      <RotateCcw class="size-4" /> 대기로
                    </Button>
                  </div>
                </div>
                <Button
                  v-if="item.status === 'not_started'"
                  class="h-12 min-w-32 flex-1 bg-emerald-700 px-4 text-white hover:bg-emerald-600"
                  :disabled="props.mutationItemId !== null"
                  @click="requestStart(item)"
                >
                  <Loader2 v-if="props.mutationItemId === item.id" class="size-4 animate-spin" />
                  <Check v-else class="size-4" /> 세부 작업 시작
                </Button>
                <Button
                  v-else-if="item.status === 'in_progress' && canComplete(item)"
                  class="h-12 min-w-32 flex-1 bg-[#171b18] px-4 text-white hover:bg-[#2d352e]"
                  :disabled="props.mutationItemId !== null"
                  @click="requestComplete(item)"
                >
                  <Loader2 v-if="props.mutationItemId === item.id" class="size-4 animate-spin" />
                  <Check v-else class="size-4" /> 세부 작업 완료
                </Button>
                <span
                  v-else-if="item.status === 'in_progress'"
                  class="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#d9ddd5] bg-[#edf0eb] px-3 text-xs font-semibold text-[#697067]"
                >
                  다른 작업자가 이 세부 작업 진행 중
                </span>
                <span
                  v-else-if="item.status === 'completed' && props.role !== 'manager'"
                  class="inline-flex h-12 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"
                >
                  세부 작업 완료됨
                </span>
              </div>
            </article>
          </div>
        </div>
      </Transition>
    </article>
  </div>
</template>

<style scoped>
.work-accordion-enter-active,
.work-accordion-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
  transform-origin: top;
}

.work-accordion-enter-from,
.work-accordion-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem);
}
</style>
