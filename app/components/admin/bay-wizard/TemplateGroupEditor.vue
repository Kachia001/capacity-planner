<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  ChevronRight,
  Copy,
  ListFilter,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { TemplateGroupDraft, TemplateItemDraft } from '@/types/template'

const groups = defineModel<TemplateGroupDraft[]>('groups', { required: true })

const searchQuery = ref('')
const selectedGroupId = ref<string | null>(null)
const pendingGroupDeleteId = ref<string | null>(null)
let localId = 0

function makeClientId(prefix: string) {
  localId += 1
  return `${prefix}-${Date.now()}-${localId}`
}

function makeBlankItem(sortOrder = 1): TemplateItemDraft {
  return {
    clientId: makeClientId('item'),
    sortOrder,
    legacySourceRow: null,
    workDetail: '',
    vendor: '',
    partNo: '',
    itemName: '',
    bolt: '',
    isHighAltitude: false,
    safetyNote: '',
  }
}

function normalizeOrder() {
  groups.value.forEach((group, groupIndex) => {
    group.sortOrder = groupIndex + 1
    group.items.forEach((item, itemIndex) => {
      item.sortOrder = itemIndex + 1
    })
  })
}

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()

  if (!query) {
    return groups.value
  }

  return groups.value.filter(group =>
    [
      group.workName,
      group.workNo?.toString() ?? '',
      ...group.items.flatMap(item => [
        item.workDetail,
        item.vendor,
        item.partNo,
        item.itemName,
        item.bolt,
        item.safetyNote,
      ]),
    ].some(value => value.toLocaleLowerCase().includes(query)),
  )
})

const selectedGroup = computed(() => {
  const selected = groups.value.find(group => group.clientId === selectedGroupId.value)
  return selected ?? filteredGroups.value[0] ?? groups.value[0] ?? null
})

watch(
  () => groups.value.length,
  () => {
    if (!groups.value.some(group => group.clientId === selectedGroupId.value)) {
      selectedGroupId.value = groups.value[0]?.clientId ?? null
    }
  },
  { immediate: true },
)

function selectGroup(groupId: string) {
  selectedGroupId.value = groupId
  pendingGroupDeleteId.value = null
}

function addGroup() {
  const group: TemplateGroupDraft = {
    clientId: makeClientId('group'),
    sortOrder: groups.value.length + 1,
    kind: 'work',
    workNo: null,
    workName: '',
    items: [makeBlankItem()],
  }

  groups.value.push(group)
  selectedGroupId.value = group.clientId
  normalizeOrder()
}

function duplicateGroup(group: TemplateGroupDraft) {
  const sourceIndex = groups.value.findIndex(candidate => candidate.clientId === group.clientId)
  const copy: TemplateGroupDraft = {
    ...group,
    clientId: makeClientId('group'),
    workName: group.workName ? `${group.workName} 복사본` : '',
    items: group.items.map(item => ({
      ...item,
      clientId: makeClientId('item'),
      legacySourceRow: null,
    })),
  }

  groups.value.splice(sourceIndex + 1, 0, copy)
  selectedGroupId.value = copy.clientId
  normalizeOrder()
}

function requestDeleteGroup(group: TemplateGroupDraft) {
  if (pendingGroupDeleteId.value !== group.clientId) {
    pendingGroupDeleteId.value = group.clientId
    return
  }

  const index = groups.value.findIndex(candidate => candidate.clientId === group.clientId)
  groups.value.splice(index, 1)
  pendingGroupDeleteId.value = null
  selectedGroupId.value = groups.value[Math.min(index, groups.value.length - 1)]?.clientId ?? null
  normalizeOrder()
}

function moveGroup(group: TemplateGroupDraft, offset: -1 | 1) {
  const currentIndex = groups.value.findIndex(candidate => candidate.clientId === group.clientId)
  const nextIndex = currentIndex + offset

  if (nextIndex < 0 || nextIndex >= groups.value.length) {
    return
  }

  const [moved] = groups.value.splice(currentIndex, 1)
  if (!moved) {
    return
  }

  groups.value.splice(nextIndex, 0, moved)
  normalizeOrder()
}

function addItem(group: TemplateGroupDraft) {
  group.items.push(makeBlankItem(group.items.length + 1))
  normalizeOrder()
}

function duplicateItem(group: TemplateGroupDraft, item: TemplateItemDraft) {
  const sourceIndex = group.items.findIndex(candidate => candidate.clientId === item.clientId)
  group.items.splice(sourceIndex + 1, 0, {
    ...item,
    clientId: makeClientId('item'),
    legacySourceRow: null,
  })
  normalizeOrder()
}

function deleteItem(group: TemplateGroupDraft, item: TemplateItemDraft) {
  if (group.items.length === 1) {
    Object.assign(item, makeBlankItem(1), { clientId: item.clientId })
    return
  }

  const index = group.items.findIndex(candidate => candidate.clientId === item.clientId)
  group.items.splice(index, 1)
  normalizeOrder()
}

function moveItem(group: TemplateGroupDraft, item: TemplateItemDraft, offset: -1 | 1) {
  const currentIndex = group.items.findIndex(candidate => candidate.clientId === item.clientId)
  const nextIndex = currentIndex + offset

  if (nextIndex < 0 || nextIndex >= group.items.length) {
    return
  }

  const [moved] = group.items.splice(currentIndex, 1)
  if (!moved) {
    return
  }

  group.items.splice(nextIndex, 0, moved)
  normalizeOrder()
}

function updateWorkNo(value: string | null | undefined) {
  if (!selectedGroup.value) return
  selectedGroup.value.workNo = value === null || value === '' ? null : Number(value)
}

function updateHighAltitude(item: TemplateItemDraft, value: boolean | 'indeterminate') {
  item.isHighAltitude = value === true
}
</script>

<template>
  <div
    class="flex flex-col gap-3 border-b border-zinc-300 bg-zinc-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
        Template workbench
      </p>
      <p class="mt-1 text-sm font-medium text-zinc-100">
        작업 그룹 {{ groups.length }}개 · 상세 작업
        {{ groups.reduce((total, group) => total + group.items.length, 0) }}개
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <label class="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
        />
        <span class="sr-only">작업 그룹 검색</span>
        <Input
          v-model="searchQuery"
          type="search"
          placeholder="작업명, 품번 검색"
          class="h-10 border-zinc-700 bg-zinc-900 pl-9 text-white placeholder:text-zinc-500"
        />
      </label>
      <Button class="h-10" @click="addGroup">
        <Plus />
        그룹 추가
      </Button>
    </div>
  </div>

  <div
    v-if="groups.length === 0"
    class="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"
  >
    <div
      class="flex size-14 items-center justify-center rounded-full border border-dashed border-emerald-500 bg-emerald-50 text-emerald-700"
    >
      <Boxes class="size-6" />
    </div>
    <h3 class="mt-5 text-lg font-semibold text-zinc-950">아직 작업 그룹이 없습니다.</h3>
    <p class="mt-2 max-w-sm text-sm leading-6 text-zinc-600">
      workName을 기준으로 첫 그룹을 추가하고, 그룹 안에 상세 작업을 구성하세요.
    </p>
    <Button class="mt-5 h-10" @click="addGroup"> <Plus /> 첫 그룹 추가 </Button>
  </div>

  <div v-else class="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[17rem_minmax(0,1fr)]">
    <aside
      class="flex min-h-0 flex-col border-b border-zinc-300 bg-[#eef2ee] lg:max-h-none lg:border-b-0 lg:border-r"
    >
      <div class="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
        <span
          class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600"
        >
          <ListFilter class="size-4" /> Group outline
        </span>
        <span class="font-mono text-xs text-zinc-500">
          {{ filteredGroups.length }}/{{ groups.length }}
        </span>
      </div>

      <div class="p-2 overflow-y-auto flex-1 min-h-0">
        <Button
          v-for="group in filteredGroups"
          :key="group.clientId"
          variant="ghost"
          class="group mb-1 h-auto w-full justify-start gap-3 rounded-sm border px-3 py-3 text-left whitespace-normal"
          :class="
            selectedGroup?.clientId === group.clientId
              ? 'border-zinc-950 bg-zinc-950 text-white shadow-sm'
              : 'border-transparent bg-transparent text-zinc-800 hover:border-zinc-300 hover:bg-white'
          "
          @click="selectGroup(group.clientId)"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] font-bold"
            :class="
              selectedGroup?.clientId === group.clientId
                ? 'border-emerald-400 text-emerald-300'
                : 'border-zinc-300 bg-white text-zinc-600'
            "
          >
            G{{ String(group.sortOrder).padStart(2, '0') }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">
              {{ group.workName || (group.kind === 'material' ? '자재 / 기타' : '작업명 미입력') }}
            </span>
            <span
              class="mt-1 block text-[11px]"
              :class="
                selectedGroup?.clientId === group.clientId ? 'text-zinc-400' : 'text-zinc-500'
              "
            >
              {{ group.items.length }}개 항목 · No. {{ group.workNo ?? '—' }}
            </span>
          </span>
          <ChevronRight class="size-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5" />
        </Button>

        <div v-if="filteredGroups.length === 0" class="px-3 py-8 text-center text-sm text-zinc-500">
          검색 결과가 없습니다.
        </div>
      </div>
    </aside>

    <section v-if="selectedGroup" class="flex min-w-0 flex-col overflow-hidden bg-white">
      <div
        class="z-10 shrink-0 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-5"
      >
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div class="grid flex-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_10rem]">
            <div class="grid gap-1.5">
              <Label for="work-no">Work No.</Label>
              <Input
                id="work-no"
                :model-value="selectedGroup.workNo?.toString() ?? ''"
                type="number"
                min="0"
                class="h-10 font-mono"
                placeholder="10"
                @update:model-value="updateWorkNo"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="work-name">workName</Label>
              <Input
                id="work-name"
                v-model="selectedGroup.workName"
                type="text"
                class="h-10 font-medium"
                :placeholder="selectedGroup.kind === 'material' ? '선택 입력' : '예: 프레임 조립'"
              />
            </div>
            <div class="grid gap-1.5">
              <Label>그룹 유형</Label>
              <Select v-model="selectedGroup.kind">
                <SelectTrigger class="h-10 w-full">
                  <SelectValue placeholder="그룹 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">작업 그룹</SelectItem>
                  <SelectItem value="material">자재 / 기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-lg"
              title="그룹을 위로 이동"
              :disabled="selectedGroup.sortOrder === 1"
              aria-label="그룹을 위로 이동"
              @click="moveGroup(selectedGroup, -1)"
            >
              <ArrowUp />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              title="그룹을 아래로 이동"
              :disabled="selectedGroup.sortOrder === groups.length"
              aria-label="그룹을 아래로 이동"
              @click="moveGroup(selectedGroup, 1)"
            >
              <ArrowDown />
            </Button>
            <Button variant="outline" class="h-10" @click="duplicateGroup(selectedGroup)">
              <Copy /> 복제
            </Button>
            <Button
              variant="destructive"
              class="h-10"
              :class="
                pendingGroupDeleteId === selectedGroup.clientId
                  ? 'bg-destructive text-destructive-foreground'
                  : ''
              "
              @click="requestDeleteGroup(selectedGroup)"
            >
              <Trash2 />
              {{
                pendingGroupDeleteId === selectedGroup.clientId ? '한 번 더 눌러 삭제' : '그룹 삭제'
              }}
            </Button>
          </div>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-col space-y-3 p-4 sm:p-5">
        <div
          class="flex shrink-0 flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
              G{{ String(selectedGroup.sortOrder).padStart(2, '0') }} / child operations
            </p>
            <h3 class="mt-1 text-base font-semibold text-zinc-950">
              상세 작업 {{ selectedGroup.items.length }}개
            </h3>
          </div>
          <Button class="h-10" @click="addItem(selectedGroup)"> <Plus /> 상세 작업 추가 </Button>
        </div>
        <section class="space-y-3 overflow-y-auto">
          <Card
            v-for="item in selectedGroup.items"
            :key="item.clientId"
            class="gap-0 rounded-sm p-3 py-3 transition focus-within:ring-2 focus-within:ring-ring"
          >
            <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-wrap items-center gap-2">
                <Badge class="size-7 rounded-sm p-0 font-mono text-[10px]">
                  {{ String(item.sortOrder).padStart(2, '0') }}
                </Badge>
                <Label
                  class="inline-flex cursor-pointer items-center gap-2 rounded-sm border px-2.5 py-1 text-[11px] font-bold transition"
                  :class="
                    item.isHighAltitude
                      ? 'border-amber-400 bg-amber-100 text-amber-950'
                      : 'border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400'
                  "
                >
                  <Checkbox
                    :model-value="item.isHighAltitude"
                    @update:model-value="updateHighAltitude(item, $event)"
                  />
                  <ShieldAlert class="size-3.5" />
                  {{ item.isHighAltitude ? '고소작업' : '일반작업' }}
                </Label>
                <Badge v-if="item.legacySourceRow" variant="outline" class="font-mono text-[10px]">
                  LEGACY ROW {{ item.legacySourceRow }}
                </Badge>
              </div>
              <div class="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  title="상세 작업을 위로 이동"
                  :disabled="item.sortOrder === 1"
                  aria-label="상세 작업을 위로 이동"
                  @click="moveItem(selectedGroup, item, -1)"
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  title="상세 작업을 아래로 이동"
                  :disabled="item.sortOrder === selectedGroup.items.length"
                  aria-label="상세 작업을 아래로 이동"
                  @click="moveItem(selectedGroup, item, 1)"
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  title="상세 작업 복제"
                  aria-label="상세 작업 복제"
                  @click="duplicateItem(selectedGroup, item)"
                >
                  <Copy />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-lg"
                  title="상세 작업 삭제"
                  aria-label="상세 작업 삭제"
                  @click="deleteItem(selectedGroup, item)"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            <div
              class="grid gap-3 xl:grid-cols-[minmax(14rem,1.4fr)_minmax(8rem,0.7fr)_minmax(8rem,0.8fr)_minmax(12rem,1fr)_7rem]"
            >
              <div class="grid gap-1.5">
                <Label :for="`work-detail-${item.clientId}`">workDetail</Label>
                <Textarea
                  :id="`work-detail-${item.clientId}`"
                  v-model="item.workDetail"
                  rows="2"
                  class="min-h-20 resize-y"
                  placeholder="상세 작업을 입력하세요"
                />
              </div>
              <div class="grid gap-1.5">
                <Label :for="`vendor-${item.clientId}`">vendor</Label>
                <Input :id="`vendor-${item.clientId}`" v-model="item.vendor" placeholder="업체" />
              </div>
              <div class="grid gap-1.5">
                <Label :for="`part-no-${item.clientId}`">partNo</Label>
                <Input
                  :id="`part-no-${item.clientId}`"
                  v-model="item.partNo"
                  class="font-mono"
                  placeholder="품번"
                />
              </div>
              <div class="grid gap-1.5">
                <Label :for="`item-name-${item.clientId}`">itemName</Label>
                <Input
                  :id="`item-name-${item.clientId}`"
                  v-model="item.itemName"
                  placeholder="품명"
                />
              </div>
              <div class="grid gap-1.5">
                <Label :for="`bolt-${item.clientId}`">bolt</Label>
                <Input
                  :id="`bolt-${item.clientId}`"
                  v-model="item.bolt"
                  class="font-mono"
                  placeholder="규격"
                />
              </div>
            </div>
            <div
              v-if="item.isHighAltitude"
              class="mt-3 grid gap-1.5 rounded-sm border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-950"
            >
              <Label :for="`safety-note-${item.clientId}`" class="flex items-center gap-2">
                <ShieldAlert class="size-4" /> 고소작업 안전 참고사항
              </Label>
              <Textarea
                :id="`safety-note-${item.clientId}`"
                v-model="item.safetyNote"
                rows="2"
                maxlength="1000"
                class="resize-y bg-white font-normal"
                placeholder="작업 전 확인할 안전 조치나 현장 참고사항을 입력하세요."
              />
            </div>
          </Card>
        </section>
      </div>
    </section>

    <section
      v-else
      class="flex min-h-80 flex-col items-center justify-center bg-white px-6 text-center"
    >
      <Wrench class="size-7 text-zinc-400" />
      <p class="mt-3 text-sm font-medium text-zinc-700">편집할 그룹을 선택하세요.</p>
    </section>
  </div>
</template>
