<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FilePlus2,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from '@lucide/vue'
import TemplateGroupEditor from '@/components/admin/bay-wizard/TemplateGroupEditor.vue'
import { Button } from '@/components/ui/button'
import {
  cloneTemplateGroups,
  createBlankTemplateGroups,
  fetchBayTemplates,
} from '@/composables/useBayTemplates'
import type { ExistingTemplateDraft, TemplateGroupDraft, TemplateSource } from '@/types/template'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})
useHead({ title: '새 베이 생성 옵션 · Capacity Planner' })

const auth = useAuthStore()
const name = ref('')
const description = ref('')
const source = ref<TemplateSource>('blank')
const sourceTemplateId = ref('')
const groups = ref<TemplateGroupDraft[]>(createBlankTemplateGroups())
const templates = ref<ExistingTemplateDraft[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const savePending = ref(false)
const savedTemplateName = ref<string | null>(null)

const groupCount = computed(() => groups.value.length)
const itemCount = computed(() => groups.value.reduce((sum, group) => sum + group.items.length, 0))
const invalidGroupCount = computed(
  () =>
    groups.value.filter(
      group => (group.kind === 'work' && !group.workName.trim()) || group.items.length === 0,
    ).length,
)
const emptyItemCount = computed(() =>
  groups.value.reduce(
    (sum, group) =>
      sum +
      group.items.filter(
        item =>
          item.legacySourceRow === null &&
          ![item.workDetail, item.vendor, item.partNo, item.itemName, item.bolt].some(value =>
            value.trim(),
          ),
      ).length,
    0,
  ),
)
const canSave = computed(
  () =>
    name.value.trim().length >= 2 &&
    groupCount.value > 0 &&
    invalidGroupCount.value === 0 &&
    emptyItemCount.value === 0 &&
    !savePending.value,
)

function applySource(nextSource: TemplateSource) {
  source.value = nextSource
  if (nextSource === 'blank') {
    groups.value = createBlankTemplateGroups()
    return
  }
  const template =
    templates.value.find(candidate => candidate.id === sourceTemplateId.value) ?? templates.value[0]
  if (template) {
    sourceTemplateId.value = template.id
    groups.value = cloneTemplateGroups(template.groups)
    if (!name.value.trim()) name.value = `${template.name} 복제본`
  }
}

function applySelectedTemplate() {
  const template = templates.value.find(candidate => candidate.id === sourceTemplateId.value)
  if (template) groups.value = cloneTemplateGroups(template.groups)
}

async function loadTemplates() {
  loading.value = true
  try {
    await auth.initialize()
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    templates.value = await fetchBayTemplates()
    sourceTemplateId.value = templates.value[0]?.id ?? ''
  } catch (error) {
    loadError.value =
      error instanceof Error ? error.message : '기존 베이 생성 옵션을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function saveTemplate() {
  if (!canSave.value) return
  savePending.value = true
  saveError.value = null
  try {
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    const created = await $fetch<{ name: string }>('/api/bay-templates', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        description: description.value.trim(),
        groups: cloneTemplateGroups(groups.value),
      },
    })
    savedTemplateName.value = created.name
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '생성 옵션을 저장하지 못했습니다.'
  } finally {
    savePending.value = false
  }
}

function resetForm() {
  name.value = ''
  description.value = ''
  savedTemplateName.value = null
  applySource('blank')
}

onMounted(loadTemplates)
</script>

<template>
  <main class="min-h-full bg-[#edf2ee] pb-28 text-zinc-950">
    <header class="border-b border-zinc-300 bg-[#f8faf7]">
      <div class="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <NuxtLink
            to="/admin/bays"
            class="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
            ><ArrowLeft class="size-4" /> Bay 목록</NuxtLink
          ><NuxtLink
            to="/admin/bays/new"
            class="text-sm font-semibold text-emerald-700 hover:underline"
            >BAY 생성으로 이동</NuxtLink
          >
        </div>
        <div class="mt-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p class="font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-700">
              Blueprint workshop
            </p>
            <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              재사용할 베이 생성 옵션을 설계합니다.
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              BAY와 무관한 표준 작업 구조를 만들고 저장합니다. 실제 운영 단위 생성은 별도 BAY 생성
              화면에서 진행합니다.
            </p>
          </div>
          <dl class="grid grid-cols-2 overflow-hidden rounded-sm border border-zinc-300 bg-white">
            <div class="border-r border-zinc-200 px-5 py-3">
              <dt class="font-mono text-[10px] uppercase text-zinc-500">Groups</dt>
              <dd class="mt-1 text-xl font-semibold">{{ groupCount }}</dd>
            </div>
            <div class="px-5 py-3">
              <dt class="font-mono text-[10px] uppercase text-zinc-500">Items</dt>
              <dd class="mt-1 text-xl font-semibold">{{ itemCount }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </header>

    <div v-if="savedTemplateName" class="mx-auto max-w-3xl px-4 py-14 text-center">
      <section class="rounded-md border border-emerald-300 bg-white p-8 shadow-xl">
        <CheckCircle2 class="mx-auto size-12 text-emerald-600" />
        <h2 class="mt-5 text-2xl font-semibold">
          {{ savedTemplateName }} 생성 옵션을 저장했습니다.
        </h2>
        <p class="mt-2 text-sm text-zinc-600">
          이제 새 BAY를 만들 때 이 생성 옵션을 선택할 수 있습니다.
        </p>
        <div class="mt-7 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            tone="neutral"
            size="lg"
            shape="compact"
            class="border-zinc-300"
            @click="resetForm"
          >
            <RotateCcw class="size-4" /> 다른 생성 옵션 만들기
          </Button>
          <Button as-child variant="solid" tone="neutral" size="lg" shape="compact">
            <NuxtLink to="/admin/bays/new">이 생성 옵션으로 BAY 생성</NuxtLink>
          </Button>
        </div>
      </section>
    </div>

    <div v-else class="mx-auto w-full max-w-[92rem] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section
        class="grid gap-6 rounded-md border border-zinc-300 bg-white p-5 shadow-sm xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-2 text-sm font-semibold"
            >생성 옵션 이름<input
              v-model="name"
              maxlength="100"
              class="h-11 rounded-sm border border-zinc-300 px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="예: 표준 조립 공정"
            /><span class="text-xs font-normal text-zinc-500">2자 이상 입력하세요.</span></label
          ><label class="grid gap-2 text-sm font-semibold"
            >설명<textarea
              v-model="description"
              maxlength="300"
              rows="3"
              class="resize-none rounded-sm border border-zinc-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="사용 기준 또는 적용 대상"
            />
          </label>
        </div>
        <div class="rounded-sm border border-zinc-200 bg-[#f7f9f6] p-4">
          <p class="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Starting point
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              :variant="source === 'blank' ? 'solid' : 'outline'"
              tone="neutral"
              size="md"
              shape="compact"
              class="text-xs"
              @click="applySource('blank')"
            >
              빈 구성
            </Button>
            <Button
              type="button"
              :disabled="templates.length === 0"
              disabled-reason="복제할 기존 생성 옵션이 없습니다."
              :variant="source === 'clone' ? 'solid' : 'outline'"
              tone="neutral"
              size="md"
              shape="compact"
              class="text-xs"
              @click="applySource('clone')"
            >
              <Copy class="mr-1 inline size-3.5" />기존 복제
            </Button>
          </div>
          <div v-if="source === 'clone'" class="mt-3">
            <select
              v-model="sourceTemplateId"
              class="h-10 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm"
              @change="applySelectedTemplate"
            >
              <option v-for="template in templates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
          </div>
          <p v-if="loading" class="mt-3 flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 class="size-3.5 animate-spin" /> 기존 생성 옵션 확인 중
          </p>
          <p v-if="loadError" class="mt-3 text-xs text-red-700">{{ loadError }}</p>
        </div>
      </section>

      <TemplateGroupEditor v-model:groups="groups" />

      <div
        v-if="invalidGroupCount || emptyItemCount"
        class="flex gap-3 rounded-sm border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <TriangleAlert class="size-5 shrink-0" />
        <p>
          작업명 미입력 그룹 {{ invalidGroupCount }}개, 완전히 빈 상세 작업 {{ emptyItemCount }}개를
          확인하세요.
        </p>
      </div>
      <p
        v-if="saveError"
        role="alert"
        class="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {{ saveError }}
      </p>
    </div>

    <footer
      v-if="!savedTemplateName"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-300 bg-[#f8faf7]/95 backdrop-blur lg:left-64"
    >
      <div
        class="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
      >
        <p class="hidden text-xs text-zinc-500 sm:block">
          생성 옵션 저장은 BAY를 생성하지 않습니다.
        </p>
        <Button
          type="button"
          :disabled="!canSave"
          :loading="savePending"
          loading-text="저장 중"
          disabled-reason="생성 옵션 이름과 작업 구성을 확인해 주세요."
          variant="solid"
          tone="neutral"
          size="lg"
          shape="compact"
          class="ml-auto"
          @click="saveTemplate"
        >
          <FilePlus2 class="size-4" />생성 옵션 저장
        </Button>
      </div>
    </footer>
  </main>
</template>
