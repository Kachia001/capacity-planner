<script setup lang="ts">
import { AlertCircle, Pencil } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { OperationWorkItemIssue, WorkItemIssueStatus } from '@/types/operations'

const props = defineProps<{
  issues: OperationWorkItemIssue[]
  canManage: boolean
  pending: boolean
  selectable?: boolean
}>()

const emit = defineEmits<{
  updateStatus: [issueId: number, status: WorkItemIssueStatus]
  editContent: [issue: OperationWorkItemIssue]
  select: [issue: OperationWorkItemIssue]
}>()

const categoryLabels = {
  material_shortage: '자재부족',
  work_delay: '작업지연',
  quality_issue: '품질이슈',
  other: '기타',
} as const

const statusLabels = {
  unconfirmed: '미확인',
  in_review: '확인 중',
  resolved: '처리완료',
} as const

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusClass(status: WorkItemIssueStatus) {
  if (status === 'resolved') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'in_review') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-red-200 bg-red-50 text-red-800'
}

function availableStatusOptions(status: WorkItemIssueStatus) {
  if (status === 'unconfirmed') {
    return [
      { value: 'unconfirmed', label: statusLabels.unconfirmed },
      { value: 'in_review', label: statusLabels.in_review },
    ] satisfies { value: WorkItemIssueStatus; label: string }[]
  }

  return [
    { value: 'unconfirmed', label: statusLabels.unconfirmed },
    { value: 'in_review', label: statusLabels.in_review },
    { value: 'resolved', label: statusLabels.resolved },
  ] satisfies { value: WorkItemIssueStatus; label: string }[]
}

function updateStatus(issue: OperationWorkItemIssue, event: Event) {
  const select = event.target as HTMLSelectElement
  const status = select.value as WorkItemIssueStatus
  select.value = issue.status
  emit('updateStatus', issue.id, status)
}

function selectIssue(issue: OperationWorkItemIssue) {
  if (props.selectable) emit('select', issue)
}
</script>

<template>
  <div v-if="props.issues.length" class="mt-3 grid gap-2">
    <article
      v-for="issue in props.issues"
      :key="issue.id"
      class="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs"
      :class="
        props.selectable
          ? 'cursor-pointer transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          : ''
      "
      :role="props.selectable ? 'button' : undefined"
      :tabindex="props.selectable ? 0 : undefined"
      :aria-label="props.selectable ? `이슈 #${issue.id} 작업 위치로 이동` : undefined"
      @click="selectIssue(issue)"
      @keydown.enter.prevent="selectIssue(issue)"
      @keydown.space.prevent="selectIssue(issue)"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex h-6 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 font-bold text-red-800"
        >
          <AlertCircle class="size-3" />
          {{ categoryLabels[issue.category] }}
        </span>
        <span
          class="inline-flex h-6 items-center rounded-full border px-2 font-bold"
          :class="statusClass(issue.status)"
        >
          {{ statusLabels[issue.status] }}
        </span>
        <span class="ml-auto font-mono text-[10px] text-zinc-400">#{{ issue.id }}</span>
      </div>
      <p class="mt-2 whitespace-pre-wrap leading-5 text-zinc-700">{{ issue.note }}</p>
      <div
        v-if="issue.status === 'resolved' && issue.resolutionNote"
        class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5"
      >
        <p class="font-semibold text-emerald-900">처리 내용</p>
        <p class="mt-1 whitespace-pre-wrap leading-5 text-emerald-800">
          {{ issue.resolutionNote }}
        </p>
      </div>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>{{ issue.createdByName || issue.createdByEmail || '등록자 미확인' }}</span>
        <span>생성 {{ formatDateTime(issue.createdAt) }}</span>
      </div>
      <div class="mt-1 flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        <span>최종 업데이트 {{ formatDateTime(issue.updatedAt) }}</span>
        <span v-if="issue.closedAt">마감 {{ formatDateTime(issue.closedAt) }}</span>
      </div>
      <div
        v-if="props.canManage && issue.status !== 'resolved'"
        class="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_auto]"
      >
        <label class="grid gap-1 font-semibold text-zinc-600">
          이슈 상태
          <select
            :value="issue.status"
            :disabled="props.pending"
            class="h-9 rounded-md border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-zinc-100"
            @change="updateStatus(issue, $event)"
            @click.stop
          >
            <option
              v-for="option in availableStatusOptions(issue.status)"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          tone="neutral"
          size="md"
          :disabled="props.pending"
          :aria-label="`이슈 #${issue.id} 내용 수정`"
          @click.stop="emit('editContent', issue)"
        >
          <Pencil class="size-3.5" />
          내용 수정
        </Button>
      </div>
      <p
        v-else-if="props.canManage"
        class="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800"
      >
        처리완료된 이슈는 변경할 수 없습니다.
      </p>
    </article>
  </div>
</template>
