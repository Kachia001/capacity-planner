<script setup lang="ts">
import { ArrowUpRight, Link2 } from '@lucide/vue'
import { computed } from 'vue'
import TableFloorPlanCard from '@/components/operations/TableFloorPlanCard.vue'
import type { WorkTableOverview } from '#shared/api/tables/table.contract'

const props = withDefaults(
  defineProps<{
    tables: WorkTableOverview[]
    pending?: boolean
    canManage?: boolean
  }>(),
  { canManage: true },
)

const emit = defineEmits<{
  select: [tableNumber: number]
}>()

const tableMap = computed(() => new Map(props.tables.map(table => [table.number, table])))
const topLeft = [1, 2, 3, 4, 5, 6]
const topRight = [7, 8, 9]
const bottomLeft = [10, 11, 12, 13, 14, 15]
const bottomRight = [16, 17, 18]

function tableAt(number: number): WorkTableOverview {
  return tableMap.value.get(number) ?? { number, bay: null }
}

function tableNumberLabel(number: number) {
  return String(number).padStart(3, '0')
}

function statusLabel(table: WorkTableOverview) {
  if (!table.bay) return '미배치'
  if (table.bay.openIssues > 0) return `이슈 ${table.bay.openIssues}`
  if (table.bay.completionRate === 100) return '완료'
  if (table.bay.inProgress > 0) return '작업 중'
  return '대기'
}
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border border-[#343d43] bg-[#1d252b] shadow-[0_20px_50px_rgba(15,22,26,0.18)]"
  >
    <div class="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
      <div>
        <p class="font-mono text-[9px] uppercase tracking-[0.2em] text-[#aab5bb]">Floor layout</p>
        <p class="mt-1 text-sm font-semibold">테이블 배치 현황</p>
      </div>
      <p class="text-[10px] text-[#aab5bb]">테이블을 선택하면 상세 현황으로 이동합니다.</p>
    </div>

    <div v-if="props.pending" class="flex h-96 items-center justify-center text-sm text-[#aab5bb]">
      배치 정보를 불러오는 중입니다.
    </div>

    <div v-else data-layout="desktop" class="hidden overflow-x-auto p-4 lg:block sm:p-6">
      <div class="mx-auto min-w-[880px] max-w-[1120px] border border-[#c5cdd1] p-9">
        <div class="grid grid-cols-[2fr_1fr] gap-14">
          <div class="grid grid-cols-6 gap-7">
            <TableFloorPlanCard
              v-for="number in topLeft"
              :key="number"
              :table="tableAt(number)"
              :number-label="tableNumberLabel(number)"
              :status-label="statusLabel(tableAt(number))"
              :can-manage="props.canManage"
              @select="emit('select', number)"
            />
          </div>
          <div class="grid grid-cols-3 gap-7">
            <TableFloorPlanCard
              v-for="number in topRight"
              :key="number"
              :table="tableAt(number)"
              :number-label="tableNumberLabel(number)"
              :status-label="statusLabel(tableAt(number))"
              :can-manage="props.canManage"
              @select="emit('select', number)"
            />
          </div>
        </div>

        <div class="my-7 grid grid-cols-[2fr_1fr] gap-14" aria-hidden="true">
          <div class="h-7 border border-[#c5cdd1] bg-white/[0.025]" />
          <div class="h-7 border border-[#c5cdd1] bg-white/[0.025]" />
        </div>

        <div class="grid grid-cols-[2fr_1fr] gap-14">
          <div class="grid grid-cols-6 gap-7">
            <TableFloorPlanCard
              v-for="number in bottomLeft"
              :key="number"
              :table="tableAt(number)"
              :number-label="tableNumberLabel(number)"
              :status-label="statusLabel(tableAt(number))"
              :can-manage="props.canManage"
              @select="emit('select', number)"
            />
          </div>
          <div class="grid grid-cols-3 gap-7">
            <TableFloorPlanCard
              v-for="number in bottomRight"
              :key="number"
              :table="tableAt(number)"
              :number-label="tableNumberLabel(number)"
              :status-label="statusLabel(tableAt(number))"
              :can-manage="props.canManage"
              @select="emit('select', number)"
            />
          </div>
        </div>
      </div>
    </div>

    <div data-layout="mobile" class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:hidden">
      <button
        v-for="table in props.tables"
        :key="table.number"
        type="button"
        class="min-h-32 cursor-pointer border border-[#aeb8bd] bg-white/[0.035] p-3 text-left text-white transition hover:border-[#c5f277] hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5f277]"
        @click="emit('select', table.number)"
      >
        <span class="flex items-center justify-between">
          <strong class="font-mono text-lg">{{ tableNumberLabel(table.number) }}</strong>
          <ArrowUpRight class="size-3.5 text-[#9aa5ab]" />
        </span>
        <span v-if="table.bay" class="mt-5 block">
          <span class="block truncate text-xs font-semibold">{{ table.bay.code }}</span>
          <span class="mt-2 flex items-center justify-between text-[10px] text-[#aeb8bd]">
            <span>{{ table.bay.completionRate }}%</span>
            <span :class="table.bay.openIssues ? 'text-red-300' : ''"
              >이슈 {{ table.bay.openIssues }}</span
            >
          </span>
        </span>
        <span v-else class="mt-6 flex items-center gap-1.5 text-[10px] text-[#849097]">
          <Link2 class="size-3" /> {{ props.canManage ? 'BAY 할당하기' : '미배치' }}
        </span>
      </button>
    </div>
  </section>
</template>
