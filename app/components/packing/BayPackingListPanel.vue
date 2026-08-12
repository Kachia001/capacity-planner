<script setup lang="ts">
import {
  ClipboardCheck,
  ClipboardPlus,
  Loader2,
  RefreshCw,
  Save,
  TriangleAlert,
  X,
} from '@lucide/vue'
import PackingListEditor from '@/components/packing/PackingListEditor.vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  assignBayPackingList,
  clonePackingSections,
  createBlankPackingSections,
  fetchBayPackingList,
  fetchPackingTemplates,
  saveBayPackingList,
} from '@/composables/usePackingLists'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { AppRole } from '@/stores/auth'
import type { PackingSectionDraft, PackingTemplateDraft } from '@/types/packing'

const props = defineProps<{ bayId: string | null; bayCode: string | null; role: AppRole }>()
const emit = defineEmits<{
  saved: [progress: number]
  loaded: [bayId: string, progress: number | null]
}>()

const loading = ref(false)
const pending = ref(false)
const exists = ref(false)
const memo = ref('')
const version = ref(0)
const sections = ref<PackingSectionDraft[]>([])
const errorMessage = ref<string | null>(null)
const notice = ref<string | null>(null)
const assigning = ref(false)
const assignmentSourceId = ref('direct-write')
const templates = ref<PackingTemplateDraft[]>([])
const templatesLoading = ref(false)
const editable = computed(() => props.role === 'admin' || props.role === 'manager')
const totalRows = computed(() =>
  sections.value.reduce((sum, section) => sum + section.rows.length, 0),
)
const checkedRows = computed(() =>
  sections.value.reduce(
    (sum, section) => sum + section.rows.filter(row => row.isChecked).length,
    0,
  ),
)
const progress = computed(() =>
  totalRows.value > 0 ? Math.round((checkedRows.value / totalRows.value) * 100) : 0,
)
const invalid = computed(() =>
  sections.value.some(
    section => !section.name.trim() || section.rows.some(row => !row.label.trim()),
  ),
)

function applyDetail(data: Awaited<ReturnType<typeof fetchBayPackingList>>) {
  exists.value = Boolean(data)
  memo.value = data?.memo ?? ''
  version.value = data?.version ?? 0
  sections.value = data ? clonePackingSections(data.sections) : []
}

async function load() {
  assigning.value = false
  if (!props.bayId) {
    exists.value = false
    sections.value = []
    return
  }
  loading.value = true
  errorMessage.value = null
  notice.value = null
  try {
    const data = await fetchBayPackingList(props.bayId)
    applyDetail(data)
    emit('loaded', props.bayId, data?.progress ?? null)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹리스트를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

function applyAssignmentSource() {
  if (assignmentSourceId.value === 'direct-write') {
    sections.value = createBlankPackingSections()
    return
  }
  const template = templates.value.find(candidate => candidate.id === assignmentSourceId.value)
  sections.value = template ? clonePackingSections(template.sections) : []
}

async function beginAssignment() {
  assigning.value = true
  assignmentSourceId.value = 'direct-write'
  sections.value = createBlankPackingSections()
  errorMessage.value = null
  notice.value = null

  if (templates.value.length > 0) return
  templatesLoading.value = true
  try {
    templates.value = await fetchPackingTemplates()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(
      error,
      '패킹 템플릿을 불러오지 못했습니다. 직접 작성은 계속 사용할 수 있습니다.',
    )
  } finally {
    templatesLoading.value = false
  }
}

function cancelAssignment() {
  assigning.value = false
  sections.value = []
  errorMessage.value = null
}

async function assign() {
  if (!props.bayId || !editable.value || invalid.value) return
  pending.value = true
  errorMessage.value = null
  notice.value = null
  try {
    const data = await assignBayPackingList(props.bayId, sections.value)
    applyDetail(data)
    assigning.value = false
    notice.value = '패킹리스트를 할당했습니다.'
    emit('saved', data.progress)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹리스트를 할당하지 못했습니다.')
  } finally {
    pending.value = false
  }
}

async function save() {
  if (!props.bayId || !editable.value || invalid.value) return
  pending.value = true
  errorMessage.value = null
  notice.value = null
  try {
    const data = await saveBayPackingList(props.bayId, {
      memo: memo.value,
      version: version.value,
      sections: sections.value,
    })
    version.value = data.version
    sections.value = clonePackingSections(data.sections)
    notice.value = '패킹리스트를 저장했습니다.'
    emit('saved', data.progress)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹리스트를 저장하지 못했습니다.')
  } finally {
    pending.value = false
  }
}

watch(
  () => props.bayId,
  () => void load(),
  { immediate: true },
)

watch(assignmentSourceId, applyAssignmentSource)
</script>

<template>
  <section v-if="props.bayId" class="bg-[#f5f8f5] px-4 pb-8 sm:px-6">
    <div class="mx-auto max-w-7xl rounded-xl border border-[#d9ddd5] bg-white shadow-sm">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
        <div class="flex items-center gap-3">
          <span
            class="flex size-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"
            ><ClipboardCheck class="size-5"
          /></span>
          <div>
            <p class="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              {{ props.bayCode }} / Packing
            </p>
            <h2 class="font-semibold">패킹리스트</h2>
          </div>
        </div>
        <div v-if="exists" class="min-w-52">
          <div class="flex justify-between text-xs">
            <span class="font-semibold">패킹 진행률</span
            ><strong>{{ checkedRows }} / {{ totalRows }} · {{ progress }}%</strong>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div class="h-full bg-emerald-500 transition-all" :style="{ width: `${progress}%` }" />
          </div>
        </div>
      </header>

      <div v-if="loading" class="flex min-h-40 items-center justify-center text-sm text-zinc-500">
        <Loader2 class="mr-2 size-5 animate-spin" /> 패킹리스트를 불러오는 중입니다.
      </div>
      <div
        v-else-if="errorMessage && !exists && !assigning"
        class="flex min-h-40 flex-col items-center justify-center p-6 text-center text-red-700"
      >
        <TriangleAlert class="size-6" />
        <p class="mt-2 text-sm">{{ errorMessage }}</p>
        <Button type="button" variant="outline" size="sm" class="mt-3" @click="load"
          ><RefreshCw /> 다시 시도</Button
        >
      </div>
      <div
        v-else-if="!exists && editable && !assigning"
        class="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center"
      >
        <span class="flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <ClipboardPlus class="size-6" />
        </span>
        <h3 class="mt-4 font-semibold">할당된 패킹리스트가 없습니다.</h3>
        <p class="mt-2 max-w-lg text-sm leading-6 text-zinc-500">
          직접 작성하거나 기존 패킹 템플릿을 복사해 이 Bay에 독립적인 패킹리스트를 할당할 수
          있습니다.
        </p>
        <Button type="button" class="mt-5" @click="beginAssignment">
          <ClipboardPlus /> 패킹리스트 할당
        </Button>
      </div>
      <div
        v-else-if="!exists && !editable"
        class="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center"
      >
        <span class="flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
          <ClipboardPlus class="size-6" />
        </span>
        <h3 class="mt-4 font-semibold">할당된 패킹리스트가 없습니다.</h3>
        <p class="mt-2 text-sm text-zinc-500">
          패킹리스트가 할당되면 이 화면에서 조회할 수 있습니다.
        </p>
      </div>
      <div v-else-if="!exists && editable && assigning" class="space-y-5 p-5">
        <div
          class="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-zinc-50 p-4"
        >
          <label class="grid w-full max-w-md gap-2 text-xs font-semibold text-zinc-600">
            구성 방식
            <select
              v-model="assignmentSourceId"
              :disabled="templatesLoading"
              class="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="direct-write">직접 작성</option>
              <option v-for="template in templates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
          </label>
          <Button type="button" variant="ghost" tone="neutral" size="sm" @click="cancelAssignment">
            <X /> 할당 취소
          </Button>
        </div>
        <p class="text-xs leading-5 text-zinc-500">
          템플릿은 현재 편집 화면으로 복사됩니다. 여기서 변경한 내용은 원본 템플릿에 반영되지
          않습니다.
        </p>
        <PackingListEditor v-model="sections" />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p v-if="errorMessage" class="text-sm font-semibold text-red-700">{{ errorMessage }}</p>
          <span v-else />
          <Button type="button" :disabled="invalid" :loading="pending" @click="assign">
            <ClipboardPlus /> 이 Bay에 할당
          </Button>
        </div>
      </div>
      <div v-else-if="exists" class="space-y-5 p-5">
        <PackingListEditor v-model="sections" :editable="editable" operational />
        <label class="grid gap-2 text-sm font-semibold">
          전체 메모
          <Textarea
            v-model="memo"
            :disabled="!editable"
            class="min-h-36"
            placeholder="패킹리스트 전체 참고사항을 입력하세요."
          />
        </label>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p v-if="notice" class="text-sm font-semibold text-emerald-700">{{ notice }}</p>
            <p v-if="errorMessage" class="text-sm font-semibold text-red-700">{{ errorMessage }}</p>
          </div>
          <Button v-if="editable" type="button" :disabled="invalid" :loading="pending" @click="save"
            ><Save /> 저장</Button
          >
        </div>
      </div>
    </div>
  </section>
</template>
