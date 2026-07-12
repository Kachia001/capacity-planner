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
  Trash2,
  Wrench,
} from '@lucide/vue'
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

  return groups.value.filter(group => [
    group.workName,
    group.workNo?.toString() ?? '',
    ...group.items.flatMap(item => [item.workDetail, item.vendor, item.partNo, item.itemName, item.bolt]),
  ].some(value => value.toLocaleLowerCase().includes(query)))
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
</script>

<template>
  <div class="overflow-hidden rounded-md border border-zinc-300 bg-[#f8faf8] shadow-[0_16px_50px_-36px_rgba(15,23,42,0.55)]">
    <div class="flex flex-col gap-3 border-b border-zinc-300 bg-zinc-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
          Template workbench
        </p>
        <p class="mt-1 text-sm font-medium text-zinc-100">
          작업 그룹 {{ groups.length }}개 · 상세 작업 {{ groups.reduce((total, group) => total + group.items.length, 0) }}개
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
          <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <span class="sr-only">작업 그룹 검색</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="작업명, 품번 검색"
            class="h-10 w-full rounded-sm border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
        </label>
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          @click="addGroup"
        >
          <Plus class="size-4" />
          그룹 추가
        </button>
      </div>
    </div>

    <div v-if="groups.length === 0" class="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <div class="flex size-14 items-center justify-center rounded-full border border-dashed border-emerald-500 bg-emerald-50 text-emerald-700">
        <Boxes class="size-6" />
      </div>
      <h3 class="mt-5 text-lg font-semibold text-zinc-950">아직 작업 그룹이 없습니다.</h3>
      <p class="mt-2 max-w-sm text-sm leading-6 text-zinc-600">
        workName을 기준으로 첫 그룹을 추가하고, 그룹 안에 상세 작업을 구성하세요.
      </p>
      <button
        type="button"
        class="mt-5 inline-flex h-10 items-center gap-2 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
        @click="addGroup"
      >
        <Plus class="size-4" /> 첫 그룹 추가
      </button>
    </div>

    <div v-else class="grid min-h-[34rem] lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside class="border-b border-zinc-300 bg-[#eef2ee] lg:border-b-0 lg:border-r">
        <div class="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
            <ListFilter class="size-4" /> Group outline
          </span>
          <span class="font-mono text-xs text-zinc-500">{{ filteredGroups.length }}/{{ groups.length }}</span>
        </div>

        <div class="max-h-64 overflow-y-auto p-2 lg:max-h-[46rem]">
          <button
            v-for="group in filteredGroups"
            :key="group.clientId"
            type="button"
            class="group mb-1 flex w-full items-center gap-3 rounded-sm border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            :class="selectedGroup?.clientId === group.clientId
              ? 'border-zinc-950 bg-zinc-950 text-white shadow-sm'
              : 'border-transparent bg-transparent text-zinc-800 hover:border-zinc-300 hover:bg-white'"
            @click="selectGroup(group.clientId)"
          >
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] font-bold"
              :class="selectedGroup?.clientId === group.clientId ? 'border-emerald-400 text-emerald-300' : 'border-zinc-300 bg-white text-zinc-600'"
            >
              G{{ String(group.sortOrder).padStart(2, '0') }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">
                {{ group.workName || (group.kind === 'material' ? '자재 / 기타' : '작업명 미입력') }}
              </span>
              <span class="mt-1 block text-[11px]" :class="selectedGroup?.clientId === group.clientId ? 'text-zinc-400' : 'text-zinc-500'">
                {{ group.items.length }}개 항목 · No. {{ group.workNo ?? '—' }}
              </span>
            </span>
            <ChevronRight class="size-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5" />
          </button>

          <div v-if="filteredGroups.length === 0" class="px-3 py-8 text-center text-sm text-zinc-500">
            검색 결과가 없습니다.
          </div>
        </div>
      </aside>

      <section v-if="selectedGroup" class="min-w-0 bg-white">
        <div class="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div class="grid flex-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_10rem]">
              <label class="grid gap-1.5 text-xs font-semibold text-zinc-600">
                Work No.
                <input
                  v-model.number="selectedGroup.workNo"
                  type="number"
                  min="0"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 font-mono text-sm text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="10"
                >
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-zinc-600">
                workName
                <input
                  v-model="selectedGroup.workName"
                  type="text"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  :placeholder="selectedGroup.kind === 'material' ? '선택 입력' : '예: 프레임 조립'"
                >
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-zinc-600">
                그룹 유형
                <select
                  v-model="selectedGroup.kind"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="work">작업 그룹</option>
                  <option value="material">자재 / 기타</option>
                </select>
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                title="그룹을 위로 이동"
                :disabled="selectedGroup.sortOrder === 1"
                class="inline-flex size-10 items-center justify-center rounded-sm border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="그룹을 위로 이동"
                @click="moveGroup(selectedGroup, -1)"
              >
                <ArrowUp class="size-4" />
              </button>
              <button
                type="button"
                title="그룹을 아래로 이동"
                :disabled="selectedGroup.sortOrder === groups.length"
                class="inline-flex size-10 items-center justify-center rounded-sm border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="그룹을 아래로 이동"
                @click="moveGroup(selectedGroup, 1)"
              >
                <ArrowDown class="size-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-10 items-center gap-2 rounded-sm border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                @click="duplicateGroup(selectedGroup)"
              >
                <Copy class="size-4" /> 복제
              </button>
              <button
                type="button"
                class="inline-flex h-10 items-center gap-2 rounded-sm border px-3 text-xs font-semibold transition"
                :class="pendingGroupDeleteId === selectedGroup.clientId
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-red-200 text-red-700 hover:bg-red-50'"
                @click="requestDeleteGroup(selectedGroup)"
              >
                <Trash2 class="size-4" />
                {{ pendingGroupDeleteId === selectedGroup.clientId ? '한 번 더 눌러 삭제' : '그룹 삭제' }}
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-3 p-4 sm:p-5">
          <div class="flex flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                G{{ String(selectedGroup.sortOrder).padStart(2, '0') }} / child operations
              </p>
              <h3 class="mt-1 text-base font-semibold text-zinc-950">
                상세 작업 {{ selectedGroup.items.length }}개
              </h3>
            </div>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-zinc-950 bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              @click="addItem(selectedGroup)"
            >
              <Plus class="size-4" /> 상세 작업 추가
            </button>
          </div>

          <article
            v-for="item in selectedGroup.items"
            :key="item.clientId"
            class="rounded-sm border border-zinc-200 bg-[#fbfcfa] p-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-[0_10px_30px_-24px_rgba(5,150,105,0.7)]"
          >
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="flex size-7 items-center justify-center rounded-sm bg-zinc-900 font-mono text-[10px] font-bold text-white">
                  {{ String(item.sortOrder).padStart(2, '0') }}
                </span>
                <span v-if="item.legacySourceRow" class="font-mono text-[10px] text-zinc-500">
                  LEGACY ROW {{ item.legacySourceRow }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  title="상세 작업을 위로 이동"
                  :disabled="item.sortOrder === 1"
                  class="inline-flex size-9 items-center justify-center rounded-sm text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-25"
                  aria-label="상세 작업을 위로 이동"
                  @click="moveItem(selectedGroup, item, -1)"
                >
                  <ArrowUp class="size-4" />
                </button>
                <button
                  type="button"
                  title="상세 작업을 아래로 이동"
                  :disabled="item.sortOrder === selectedGroup.items.length"
                  class="inline-flex size-9 items-center justify-center rounded-sm text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-25"
                  aria-label="상세 작업을 아래로 이동"
                  @click="moveItem(selectedGroup, item, 1)"
                >
                  <ArrowDown class="size-4" />
                </button>
                <button
                  type="button"
                  title="상세 작업 복제"
                  class="inline-flex size-9 items-center justify-center rounded-sm text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-950"
                  aria-label="상세 작업 복제"
                  @click="duplicateItem(selectedGroup, item)"
                >
                  <Copy class="size-4" />
                </button>
                <button
                  type="button"
                  title="상세 작업 삭제"
                  class="inline-flex size-9 items-center justify-center rounded-sm text-red-500 transition hover:bg-red-50 hover:text-red-700"
                  aria-label="상세 작업 삭제"
                  @click="deleteItem(selectedGroup, item)"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </div>

            <div class="grid gap-3 xl:grid-cols-[minmax(14rem,1.4fr)_minmax(8rem,0.7fr)_minmax(8rem,0.8fr)_minmax(12rem,1fr)_7rem]">
              <label class="grid gap-1.5 text-[11px] font-semibold text-zinc-600">
                workDetail
                <textarea
                  v-model="item.workDetail"
                  rows="2"
                  class="min-h-20 resize-y rounded-sm border border-zinc-300 bg-white px-3 py-2 text-sm leading-5 text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="상세 작업을 입력하세요"
                />
              </label>
              <label class="grid gap-1.5 text-[11px] font-semibold text-zinc-600">
                vendor
                <input
                  v-model="item.vendor"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="업체"
                >
              </label>
              <label class="grid gap-1.5 text-[11px] font-semibold text-zinc-600">
                partNo
                <input
                  v-model="item.partNo"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 font-mono text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="품번"
                >
              </label>
              <label class="grid gap-1.5 text-[11px] font-semibold text-zinc-600">
                itemName
                <input
                  v-model="item.itemName"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="품명"
                >
              </label>
              <label class="grid gap-1.5 text-[11px] font-semibold text-zinc-600">
                bolt
                <input
                  v-model="item.bolt"
                  class="h-10 rounded-sm border border-zinc-300 bg-white px-3 font-mono text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="규격"
                >
              </label>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="flex min-h-80 flex-col items-center justify-center bg-white px-6 text-center">
        <Wrench class="size-7 text-zinc-400" />
        <p class="mt-3 text-sm font-medium text-zinc-700">편집할 그룹을 선택하세요.</p>
      </section>
    </div>
  </div>
</template>
