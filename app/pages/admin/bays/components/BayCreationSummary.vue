<script setup lang="ts">
import { Loader2, ShieldAlert, TriangleAlert } from '@lucide/vue'
import { computed } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  groupCount: number
  itemCount: number
  highAltitudeCount: number
  selectedStartLabel: string
  hasSelectedStartMethod: boolean
  editingWorkConfiguration: boolean
  isDirectWrite: boolean
  submitError: string | null
  submitPending: boolean
  canSubmit: boolean
}>()

const emit = defineEmits<{
  create: []
}>()

const statusDescription = computed(() => {
  if (!props.hasSelectedStartMethod) {
    return '베이 생성 옵션을 선택하면 다음 단계로 진행할 수 있습니다.'
  }
  if (!props.editingWorkConfiguration) {
    return props.isDirectWrite
      ? '작업 내용 변경 후 생성 버튼을 눌러 작업 구성을 작성하세요.'
      : '선택한 생성 옵션을 그대로 사용하거나 작업 내용을 변경한 뒤 생성할 수 있습니다.'
  }
  if (props.isDirectWrite) {
    return '직접 구성한 현재 작업 목록 전체를 하나의 트랜잭션으로 저장합니다.'
  }
  return '선택한 생성 옵션을 복사한 뒤 현재 편집 결과 전체를 하나의 트랜잭션으로 저장합니다.'
})

const createDisabledReason = computed(() => {
  if (!props.hasSelectedStartMethod) return '베이 생성 옵션을 먼저 선택해 주세요.'
  if (props.isDirectWrite && !props.editingWorkConfiguration) {
    return '직접 작성은 작업 내용 변경 후 생성 단계를 먼저 진행해 주세요.'
  }
  if (!props.canSubmit) return 'BAY 정보와 작업 구성을 확인해 주세요.'
  return undefined
})

function handleCreate() {
  emit('create')
}
</script>

<template>
  <Card class="h-fit gap-0 py-0 xl:sticky xl:top-24">
    <CardHeader class="border-b py-5">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Creation summary
      </p>
      <CardTitle class="text-lg">생성 준비</CardTitle>
    </CardHeader>
    <dl class="grid grid-cols-2 border-b">
      <div class="border-r p-4">
        <dt class="text-xs text-muted-foreground">그룹</dt>
        <dd class="mt-1 text-2xl font-semibold">{{ props.groupCount }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-muted-foreground">상세 작업</dt>
        <dd class="mt-1 text-2xl font-semibold">{{ props.itemCount }}</dd>
      </div>
    </dl>
    <div class="border-b p-4">
      <p class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span class="flex items-center gap-2">
          <ShieldAlert class="size-4 text-amber-600" /> 고소작업
        </span>
        <Badge variant="secondary">{{ props.highAltitudeCount }}</Badge>
      </p>
    </div>
    <CardContent class="p-5">
      <p class="text-sm font-semibold">{{ props.selectedStartLabel }}</p>
      <p class="mt-2 text-xs leading-5 text-muted-foreground">
        {{ statusDescription }}
      </p>
      <Alert v-if="props.submitError" variant="destructive" class="mt-4">
        <TriangleAlert />
        <AlertDescription>{{ props.submitError }}</AlertDescription>
      </Alert>
      <Button
        :disabled="!props.canSubmit"
        :disabled-reason="createDisabledReason"
        size="lg"
        class="mt-5 w-full"
        @click="handleCreate"
      >
        <Loader2 v-if="props.submitPending" class="animate-spin" />
        {{ props.submitPending ? '생성 중' : 'BAY 생성' }}
      </Button>
    </CardContent>
  </Card>
</template>
