<script setup lang="ts">
import { AlertCircle, Pencil } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { OperationWorkItemIssue, WorkItemIssueStatus } from '@/types/operations'

const props = defineProps<{
  issues: OperationWorkItemIssue[]
  canManage: boolean
  pending: boolean
}>()

const emit = defineEmits<{
  updateStatus: [issueId: number, status: WorkItemIssueStatus]
  editContent: [issue: OperationWorkItemIssue]
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

function updateStatus(issueId: number, event: Event) {
  emit('updateStatus', issueId, (event.target as HTMLSelectElement).value as WorkItemIssueStatus)
}
</script>

<template>
  <div v-if="props.issues.length" class="mt-3 grid gap-2">
    <article
      v-for="issue in props.issues"
      :key="issue.id"
      class="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs"
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
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>{{ issue.createdByName || issue.createdByEmail || '등록자 미확인' }}</span>
        <span>{{ formatDateTime(issue.createdAt) }}</span>
      </div>
      <div v-if="props.canManage" class="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_auto]">
        <label class="grid gap-1 font-semibold text-zinc-600">
          이슈 상태
          <select
            :value="issue.status"
            :disabled="props.pending"
            class="h-9 rounded-md border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-zinc-100"
            @change="updateStatus(issue.id, $event)"
          >
            <option value="unconfirmed">미확인</option>
            <option value="in_review">확인 중</option>
            <option value="resolved">처리완료</option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          tone="neutral"
          size="md"
          :disabled="props.pending"
          :aria-label="`이슈 #${issue.id} 내용 수정`"
          @click="emit('editContent', issue)"
        >
          <Pencil class="size-3.5" />
          내용 수정
        </Button>
      </div>
    </article>
  </div>
</template>
