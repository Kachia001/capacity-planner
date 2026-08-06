<script setup lang="ts">
import { Grid3X3 } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkTableOverview } from '#shared/api/tables/table.contract'

const props = defineProps<{
  tableNumber: number | null
  tables: WorkTableOverview[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:tableNumber': [value: number | null]
}>()

function selectTable(table: WorkTableOverview) {
  if (table.bay) return
  emit('update:tableNumber', table.number)
}
</script>

<template>
  <Card class="gap-0 py-0 shadow-sm">
    <CardHeader class="flex-row items-center gap-3 rounded-none border-b py-4">
      <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white">
        <Grid3X3 class="size-4" />
      </span>
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">02 / table assignment</p>
        <CardTitle>테이블 배치</CardTitle>
      </div>
    </CardHeader>
    <CardContent class="p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold">BAY를 배치할 테이블을 선택하세요.</p>
          <p class="mt-1 text-xs text-muted-foreground">테이블 하나에는 BAY 하나만 배치할 수 있습니다.</p>
        </div>
        <strong v-if="props.tableNumber" class="font-mono text-lg">TABLE {{ String(props.tableNumber).padStart(3, '0') }}</strong>
      </div>

      <div v-if="props.loading" class="mt-5 h-24 animate-pulse rounded-lg bg-zinc-100" />
      <div v-else class="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
        <button
          v-for="table in props.tables"
          :key="table.number"
          type="button"
          class="relative min-h-16 rounded-md border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71865e]"
          :class="[
            table.bay
              ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400'
              : 'border-zinc-300 bg-white hover:border-[#71865e] hover:bg-[#f6faef]',
            props.tableNumber === table.number ? 'border-[#71865e] bg-[#eef8dc] ring-2 ring-[#c5f277]/40' : '',
          ]"
          :disabled="Boolean(table.bay)"
          :aria-pressed="props.tableNumber === table.number"
          @click="selectTable(table)"
        >
          <span class="block font-mono text-sm font-semibold">{{ String(table.number).padStart(3, '0') }}</span>
          <span class="mt-2 block truncate text-[9px]">{{ table.bay?.code ?? '선택 가능' }}</span>
        </button>
      </div>
    </CardContent>
  </Card>
</template>

