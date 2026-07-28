<script lang="ts">
export type DetailMode = 'attention' | 'open' | 'all'
type WorkProgressStatus = 'not-started' | 'in-progress' | 'completed'

type WorkItemGroup = {
  workName: string
  items: WorkItem[]
}

export interface WorkItem {
  id: number
  bay: string
  sourceRow: number | null
  workNo: number | null
  workName: string | null
  workDetail: string | null
  vendor: string | null
  partNo: string | null
  itemName: string | null
  bolt: string | null
  hasIssue: boolean
  isCompleted: boolean
  worker: string | null
  workDate: string | null
  issueNote: string | null
}

export interface WorkItemsDetailProps {
  detailMode: DetailMode
  detailModes: DetailMode[]
  items: WorkItem[]
  detailPending: boolean
}
</script>

<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps<WorkItemsDetailProps>()

const emit = defineEmits<{
  'update:detailMode': [mode: DetailMode]
}>()

const groupedWorkItems = computed<WorkItemGroup[]>(() => {
  const groups = new Map<string, WorkItem[]>()

  for (const item of props.items) {
    const workName = normalizeWorkName(item.workName)
    const groupItems = groups.get(workName) ?? []

    groupItems.push(item)
    groups.set(workName, groupItems)
  }

  return [...groups.entries()].map(([workName, items]) => ({
    workName,
    items,
  }))
})

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'Y' : 'N'
  }

  return value
}

function normalizeWorkName(value: string | null) {
  const workName = value?.trim()

  return workName || '작업명 없음'
}

function modeLabel(mode: DetailMode) {
  if (mode === 'attention') {
    return '확인 필요'
  }

  if (mode === 'open') {
    return '미완료'
  }

  return '전체 원본'
}

function progressStatus(item: WorkItem): WorkProgressStatus {
  if (item.isCompleted) {
    return 'completed'
  }

  if (item.worker || item.workDate) {
    return 'in-progress'
  }

  return 'not-started'
}

function progressLabel(item: WorkItem) {
  const status = progressStatus(item)

  if (status === 'completed') {
    return '완료'
  }

  if (status === 'in-progress') {
    return '진행 중'
  }

  return '진행 전'
}

function progressBadgeClass(item: WorkItem) {
  const status = progressStatus(item)

  if (status === 'completed') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800'
  }

  if (status === 'in-progress') {
    return 'border-orange-200 bg-orange-100 text-orange-800'
  }

  return 'border-zinc-200 bg-zinc-100 text-zinc-700'
}

function issueBadgeClass(hasIssue: boolean) {
  return hasIssue
    ? 'border-red-200 bg-red-100 text-red-800'
    : 'border-zinc-200 bg-zinc-100 text-zinc-600'
}

function handleDetailModeChange(mode: DetailMode) {
  emit('update:detailMode', mode)
}
</script>

<template>
  <section class="rounded-md border bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-3">
      <div>
        <h3 class="text-lg font-semibold">작업 상세</h3>
        <p class="text-sm text-muted-foreground">
          {{ modeLabel(props.detailMode) }} {{ props.items.length }}건 · workName
          {{ groupedWorkItems.length }}개 그룹
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="mode in props.detailModes"
          :key="mode"
          size="sm"
          :variant="props.detailMode === mode ? 'default' : 'outline'"
          @click="handleDetailModeChange(mode)"
        >
          {{ modeLabel(mode) }}
        </Button>
      </div>
    </div>

    <div v-if="props.detailPending" class="py-12 text-center text-sm text-muted-foreground">
      선택 bay 상세를 불러오는 중입니다.
    </div>

    <div
      v-else-if="props.items.length === 0"
      class="py-12 text-center text-sm text-muted-foreground"
    >
      현재 필터에 표시할 작업 항목이 없습니다.
    </div>

    <div v-else class="mt-4 space-y-4">
      <div class="grid gap-2">
        <article
          v-for="item in props.items"
          :key="item.id"
          class="rounded-md border bg-[#fbfefc] p-3 text-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-medium">
                {{ displayValue(item.workName) }}
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                row {{ displayValue(item.sourceRow) }} · {{ displayValue(item.vendor) }}
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap justify-end gap-1">
              <Badge variant="outline" :class="issueBadgeClass(item.hasIssue)">
                {{ item.hasIssue ? 'Y' : 'N' }}
              </Badge>
              <Badge variant="outline" :class="progressBadgeClass(item)">
                {{ progressLabel(item) }}
              </Badge>
            </div>
          </div>
          <p class="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {{ displayValue(item.workDetail) }} · {{ displayValue(item.itemName) }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
