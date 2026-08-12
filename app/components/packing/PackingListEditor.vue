<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { makePackingClientId } from '@/composables/usePackingLists'
import type { PackingSectionDraft } from '@/types/packing'

const props = withDefaults(
  defineProps<{
    editable?: boolean
    operational?: boolean
  }>(),
  { editable: true, operational: false },
)

const sections = defineModel<PackingSectionDraft[]>({ required: true })

function normalize() {
  sections.value.forEach((section, sectionIndex) => {
    section.sortOrder = sectionIndex + 1
    section.rows.forEach((row, rowIndex) => {
      row.sortOrder = rowIndex + 1
    })
  })
}

function addSection() {
  sections.value.push({
    clientId: makePackingClientId('packing-section'),
    sortOrder: sections.value.length + 1,
    name: '',
    memo: '',
    rows: [],
  })
}

function removeSection(index: number) {
  sections.value.splice(index, 1)
  normalize()
}

function moveSection(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= sections.value.length) return
  const [section] = sections.value.splice(index, 1)
  sections.value.splice(target, 0, section!)
  normalize()
}

function addRow(sectionIndex: number) {
  const section = sections.value[sectionIndex]
  if (!section) return
  section.rows.push({
    clientId: makePackingClientId('packing-row'),
    sortOrder: section.rows.length + 1,
    label: '',
    isChecked: false,
    memo: '',
  })
}

function removeRow(sectionIndex: number, rowIndex: number) {
  sections.value[sectionIndex]?.rows.splice(rowIndex, 1)
  normalize()
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-zinc-300 bg-white">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[52rem] border-collapse text-sm">
        <thead class="bg-zinc-100 text-left text-xs text-zinc-600">
          <tr>
            <th v-if="props.operational" class="w-16 border-b border-r px-3 py-3 text-center">
              완료
            </th>
            <th class="w-52 border-b border-r px-3 py-3">섹션</th>
            <th class="border-b border-r px-3 py-3">패킹 항목</th>
            <th v-if="props.operational" class="w-72 border-b border-r px-3 py-3">메모</th>
            <th v-if="props.editable" class="w-28 border-b px-3 py-3 text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(section, sectionIndex) in sections" :key="section.clientId">
            <tr class="bg-emerald-50/70">
              <td v-if="props.operational" class="border-b border-r" />
              <td class="border-b border-r p-2 align-top">
                <Input
                  v-if="props.editable"
                  v-model="section.name"
                  :aria-label="`섹션 ${sectionIndex + 1} 이름`"
                  placeholder="예: STOKER"
                  class="font-semibold"
                />
                <strong v-else>{{ section.name }}</strong>
              </td>
              <td :colspan="props.operational ? 2 : 1" class="border-b border-r p-2">
                <Textarea
                  v-if="props.operational && props.editable"
                  v-model="section.memo"
                  placeholder="섹션 메모"
                  class="min-h-10"
                />
                <span v-else-if="props.operational" class="whitespace-pre-wrap text-zinc-600">
                  {{ section.memo || '섹션 메모 없음' }}
                </span>
                <span v-else class="text-xs text-zinc-500">{{ section.rows.length }}개 항목</span>
              </td>
              <td v-if="props.editable" class="border-b p-2 text-center">
                <div class="flex justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :disabled="sectionIndex === 0"
                    @click="moveSection(sectionIndex, -1)"
                    ><ArrowUp
                  /></Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :disabled="sectionIndex === sections.length - 1"
                    @click="moveSection(sectionIndex, 1)"
                    ><ArrowDown
                  /></Button>
                  <Button
                    type="button"
                    variant="ghost"
                    tone="danger"
                    size="icon-sm"
                    @click="removeSection(sectionIndex)"
                    ><Trash2
                  /></Button>
                </div>
              </td>
            </tr>
            <tr v-for="(row, rowIndex) in section.rows" :key="row.clientId">
              <td v-if="props.operational" class="border-b border-r p-3 text-center">
                <Checkbox
                  v-if="props.editable"
                  v-model="row.isChecked"
                  :aria-label="`${row.label || '패킹 항목'} 완료`"
                />
                <span v-else class="font-semibold">{{ row.isChecked ? '✓' : '' }}</span>
              </td>
              <td class="border-b border-r px-3 py-2 text-xs text-zinc-400">{{ section.name }}</td>
              <td class="border-b border-r p-2">
                <Input v-if="props.editable" v-model="row.label" placeholder="패킹 항목 입력" />
                <span v-else>{{ row.label }}</span>
              </td>
              <td v-if="props.operational" class="border-b border-r p-2">
                <Input v-if="props.editable" v-model="row.memo" placeholder="행 메모" />
                <span v-else class="whitespace-pre-wrap text-zinc-600">{{ row.memo || '—' }}</span>
              </td>
              <td v-if="props.editable" class="border-b p-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  tone="danger"
                  size="icon-sm"
                  @click="removeRow(sectionIndex, rowIndex)"
                  ><Trash2
                /></Button>
              </td>
            </tr>
            <tr v-if="props.editable">
              <td v-if="props.operational" class="border-b border-r" />
              <td class="border-b border-r" />
              <td :colspan="props.operational ? 2 : 1" class="border-b border-r p-2">
                <Button type="button" variant="ghost" size="sm" @click="addRow(sectionIndex)"
                  ><Plus /> {{ section.name || '이 섹션' }} 항목 추가</Button
                >
              </td>
              <td class="border-b" />
            </tr>
          </template>
          <tr v-if="sections.length === 0">
            <td
              :colspan="props.operational ? (props.editable ? 5 : 4) : props.editable ? 3 : 2"
              class="px-4 py-10 text-center text-zinc-500"
            >
              등록된 섹션이 없습니다.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="props.editable" class="border-t bg-zinc-50 p-3">
      <Button type="button" variant="outline" size="sm" @click="addSection"
        ><Plus /> 섹션 추가</Button
      >
    </div>
  </div>
</template>
