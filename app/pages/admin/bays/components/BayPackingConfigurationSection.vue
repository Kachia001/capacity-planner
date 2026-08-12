<script setup lang="ts">
import { ClipboardList } from '@lucide/vue'
import PackingListEditor from '@/components/packing/PackingListEditor.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { clonePackingSections, createBlankPackingSections } from '@/composables/usePackingLists'
import type { PackingSectionDraft, PackingTemplateDraft } from '@/types/packing'

const props = defineProps<{ templates: PackingTemplateDraft[]; loading: boolean }>()
const enabled = defineModel<boolean>('enabled', { required: true })
const sections = defineModel<PackingSectionDraft[]>('sections', { required: true })
const sourceId = ref('direct-write')

function applySource() {
  if (sourceId.value === 'direct-write') {
    sections.value = createBlankPackingSections()
    return
  }
  const template = props.templates.find(candidate => candidate.id === sourceId.value)
  sections.value = template ? clonePackingSections(template.sections) : []
}

watch(sourceId, applySource)
</script>

<template>
  <Card class="gap-0 py-0 shadow-sm">
    <CardHeader class="flex-row items-center justify-between border-b py-4">
      <div class="flex items-center gap-3">
        <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white"
          ><ClipboardList class="size-4"
        /></span>
        <div>
          <p class="font-mono text-[10px] uppercase text-zinc-400">Packing list</p>
          <CardTitle>패킹리스트</CardTitle>
        </div>
      </div>
      <label class="flex cursor-pointer items-center gap-2 text-sm font-semibold"
        ><Checkbox v-model="enabled" /> 사용</label
      >
    </CardHeader>
    <CardContent v-if="enabled" class="space-y-4 p-5">
      <label class="grid max-w-md gap-2 text-xs font-semibold text-zinc-600">
        구성 방식
        <select
          v-model="sourceId"
          :disabled="loading"
          class="h-10 rounded-md border bg-white px-3 text-sm"
        >
          <option value="direct-write">직접 작성</option>
          <option v-for="template in props.templates" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </select>
      </label>
      <p class="text-xs text-zinc-500">
        템플릿 선택 시 현재 내용을 복사합니다. 아래 복사본을 수정해도 원본 템플릿에는 반영되지
        않습니다.
      </p>
      <PackingListEditor v-model="sections" />
    </CardContent>
  </Card>
</template>
