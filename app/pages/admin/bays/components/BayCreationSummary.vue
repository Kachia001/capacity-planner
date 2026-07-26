<script setup lang="ts">
import { Loader2, ShieldAlert, TriangleAlert } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  groupCount: number
  itemCount: number
  highAltitudeCount: number
  selectedStartLabel: string
  isDirectWrite: boolean
  submitError: string | null
  submitPending: boolean
  canSubmit: boolean
}>()

const emit = defineEmits<{
  create: []
}>()

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
        {{
          props.isDirectWrite
            ? '직접 구성한 현재 작업 목록 전체를 하나의 트랜잭션으로 저장합니다.'
            : '선택한 템플릿을 복사한 뒤 현재 편집 결과 전체를 하나의 트랜잭션으로 저장합니다.'
        }}
      </p>
      <Alert v-if="props.submitError" variant="destructive" class="mt-4">
        <TriangleAlert />
        <AlertDescription>{{ props.submitError }}</AlertDescription>
      </Alert>
      <Button :disabled="!props.canSubmit" size="lg" class="mt-5 h-11 w-full" @click="handleCreate">
        <Loader2 v-if="props.submitPending" class="animate-spin" />
        {{ props.submitPending ? '생성 중' : 'BAY 생성' }}
      </Button>
    </CardContent>
  </Card>
</template>
