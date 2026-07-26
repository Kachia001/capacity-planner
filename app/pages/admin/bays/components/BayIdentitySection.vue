<script setup lang="ts">
import { Factory } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  bayCode: string
  bayDescription: string
  codeAvailable: boolean
}>()

const emit = defineEmits<{
  'update:bayCode': [value: string]
  'update:bayDescription': [value: string]
}>()

function handleBayCodeInput(value: string | null | undefined) {
  emit('update:bayCode', value ?? '')
}

function handleBayDescriptionInput(value: string | number) {
  emit('update:bayDescription', String(value))
}
</script>

<template>
  <Card class="gap-0 py-0 shadow-sm">
    <CardHeader class="flex-row items-center gap-3 rounded-none border-b py-4">
      <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white">
        <Factory class="size-4" />
      </span>
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">01 / identity</p>
        <CardTitle>BAY 정보</CardTitle>
      </div>
    </CardHeader>
    <CardContent class="grid gap-5 p-5 sm:grid-cols-2">
      <div class="grid gap-2">
        <Label for="bay-code">BAY 코드</Label>
        <Input
          id="bay-code"
          :model-value="props.bayCode"
          maxlength="40"
          class="h-11 font-mono"
          placeholder="예: BAY-A01"
          @update:model-value="handleBayCodeInput"
        />
        <span
          class="text-xs font-normal"
          :class="
            props.bayCode && !props.codeAvailable ? 'text-destructive' : 'text-muted-foreground'
          "
        >
          2–40자의 영문, 숫자, 하이픈, 밑줄을 사용하세요.
        </span>
      </div>
      <div class="grid gap-2">
        <Label for="bay-description">설명</Label>
        <Textarea
          id="bay-description"
          :model-value="props.bayDescription"
          maxlength="300"
          rows="3"
          class="min-h-20 resize-none"
          placeholder="운영 목적 또는 위치"
          @update:model-value="handleBayDescriptionInput"
        />
      </div>
    </CardContent>
  </Card>
</template>
