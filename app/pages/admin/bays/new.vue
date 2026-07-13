<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Factory,
  Layers3,
  Loader2,
  PencilRuler,
  Plus,
  ShieldAlert,
  TriangleAlert,
} from '@lucide/vue'
import TemplateGroupEditor from '@/components/admin/bay-wizard/TemplateGroupEditor.vue'
import { cloneTemplateGroups, fetchBayTemplates } from '@/composables/useBayTemplates'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { ExistingTemplateDraft, TemplateGroupDraft } from '@/types/template'

definePageMeta({ middleware: ['auth-client', 'role-client'], roles: ['admin'] })
useHead({ title: '새 BAY 만들기 · Capacity Planner' })

const auth = useAuthStore()
const planner = usePlannerStore()
const bayCode = ref('')
const bayDescription = ref('')
const templates = ref<ExistingTemplateDraft[]>([])
const selectedTemplateId = ref('')
const draftGroups = ref<TemplateGroupDraft[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const submitPending = ref(false)
const created = ref(false)

const selectedTemplate = computed(
  () => templates.value.find(template => template.id === selectedTemplateId.value) ?? null,
)
const groupCount = computed(() => draftGroups.value.length)
const itemCount = computed(() =>
  draftGroups.value.reduce((sum, group) => sum + group.items.length, 0),
)
const highAltitudeCount = computed(() =>
  draftGroups.value.reduce(
    (sum, group) => sum + group.items.filter(item => item.isHighAltitude).length,
    0,
  ),
)
const invalidGroupCount = computed(
  () =>
    draftGroups.value.filter(
      group => (group.kind === 'work' && !group.workName.trim()) || group.items.length === 0,
    ).length,
)
const emptyItemCount = computed(() =>
  draftGroups.value.reduce(
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
const codeAvailable = computed(() => {
  const code = bayCode.value.trim()
  return (
    /^[A-Za-z0-9_-]{2,40}$/.test(code) &&
    !planner.baySummaries.some(
      summary => summary.bay.toLocaleLowerCase() === code.toLocaleLowerCase(),
    )
  )
})
const canSubmit = computed(
  () =>
    codeAvailable.value &&
    Boolean(selectedTemplate.value) &&
    groupCount.value > 0 &&
    invalidGroupCount.value === 0 &&
    emptyItemCount.value === 0 &&
    !submitPending.value,
)

function applySelectedTemplate(templateId: string) {
  const template = templates.value.find(candidate => candidate.id === templateId)
  draftGroups.value = template ? cloneTemplateGroups(template.groups) : []
}

watch(selectedTemplateId, applySelectedTemplate)

async function loadTemplates() {
  loading.value = true
  loadError.value = null
  try {
    await auth.initialize()
    await planner.loadWorkItems()
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    templates.value = await fetchBayTemplates(accessToken)
    selectedTemplateId.value = templates.value[0]?.id ?? ''
    applySelectedTemplate(selectedTemplateId.value)
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '템플릿을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function createBay() {
  if (!canSubmit.value) return
  submitPending.value = true
  submitError.value = null
  try {
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    await $fetch('/api/bays', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        bay: { code: bayCode.value.trim(), description: bayDescription.value.trim() },
        groups: cloneTemplateGroups(draftGroups.value),
      },
    })
    await planner.loadWorkItems()
    created.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    submitError.value = getRequestErrorMessage(error, 'BAY를 생성하지 못했습니다.')
  } finally {
    submitPending.value = false
  }
}

onMounted(loadTemplates)
</script>

<template>
  <main class="min-h-full bg-[#edf2ee] pb-28 text-zinc-950">
    <header class="border-b border-zinc-300 bg-[#f8faf7]">
      <div class="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <NuxtLink
          to="/bay"
          class="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft class="size-4" /> 운영 현황
        </NuxtLink>
        <div class="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-700">
              Bay commissioning
            </p>
            <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              표준을 복사하고 이 Bay에 맞게 확정합니다.
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              템플릿은 시작점입니다. 복사된 작업 그룹과 상세 작업, 고소작업 구분을 검토·편집한 뒤
              독립적인 Bay 작업 목록으로 저장하세요.
            </p>
          </div>
          <NuxtLink
            to="/admin/bay-templates/new"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950"
          >
            <Plus class="size-4" /> 새 템플릿 만들기
          </NuxtLink>
        </div>
      </div>
    </header>

    <div v-if="created" class="mx-auto flex min-h-[34rem] max-w-3xl items-center px-4 py-16">
      <section
        class="w-full rounded-md border border-emerald-300 bg-white p-8 text-center shadow-xl"
      >
        <CheckCircle2 class="mx-auto size-12 text-emerald-600" />
        <h2 class="mt-5 text-2xl font-semibold">{{ bayCode }} BAY가 준비되었습니다.</h2>
        <p class="mt-2 text-sm text-zinc-600">
          {{ itemCount }}개 작업과 고소작업 {{ highAltitudeCount }}건이 현재 확정 구성으로
          생성되었습니다.
        </p>
        <NuxtLink
          :to="{ path: '/bay', query: { targetBay: bayCode } }"
          class="mt-7 inline-flex h-11 items-center gap-2 rounded-sm bg-zinc-950 px-5 text-sm font-semibold text-white"
        >
          운영 화면에서 확인 <ChevronRight class="size-4" />
        </NuxtLink>
      </section>
    </div>

    <div
      v-else
      class="mx-auto grid w-full max-w-[92rem] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-8"
    >
      <div class="min-w-0 space-y-6">
        <section class="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div class="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
            <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white">
              <Factory class="size-4" />
            </span>
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                01 / identity
              </p>
              <h2 class="font-semibold">BAY 정보</h2>
            </div>
          </div>
          <div class="grid gap-5 p-5 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-semibold">
              BAY 코드
              <input
                v-model="bayCode"
                maxlength="40"
                class="h-11 rounded-sm border border-zinc-300 px-3 font-mono outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="예: BAY-A01"
              />
              <span
                class="text-xs font-normal"
                :class="bayCode && !codeAvailable ? 'text-red-600' : 'text-zinc-500'"
              >
                2–40자의 영문, 숫자, 하이픈, 밑줄을 사용하세요.
              </span>
            </label>
            <label class="grid gap-2 text-sm font-semibold">
              설명
              <textarea
                v-model="bayDescription"
                maxlength="300"
                rows="3"
                class="resize-none rounded-sm border border-zinc-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="운영 목적 또는 위치"
              />
            </label>
          </div>
        </section>

        <section class="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div class="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div class="flex items-center gap-3">
              <span
                class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white"
              >
                <Layers3 class="size-4" />
              </span>
              <div>
                <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                  02 / blueprint
                </p>
                <h2 class="font-semibold">시작 템플릿</h2>
              </div>
            </div>
            <span class="text-xs text-zinc-500">{{ templates.length }}개</span>
          </div>
          <div
            v-if="loading"
            class="flex min-h-56 items-center justify-center gap-2 text-sm text-zinc-500"
          >
            <Loader2 class="size-5 animate-spin" /> 템플릿을 불러오는 중
          </div>
          <div
            v-else-if="loadError"
            class="m-5 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {{ loadError }}
          </div>
          <div v-else-if="templates.length === 0" class="p-8 text-center">
            <p class="font-semibold">사용할 수 있는 템플릿이 없습니다.</p>
            <p class="mt-2 text-sm text-zinc-500">먼저 작업 템플릿을 만들어 주세요.</p>
            <NuxtLink
              to="/admin/bay-templates/new"
              class="mt-5 inline-flex h-10 items-center gap-2 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white"
            >
              <Plus class="size-4" /> 첫 템플릿 만들기
            </NuxtLink>
          </div>
          <div v-else class="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            <label
              v-for="template in templates"
              :key="template.id"
              class="relative cursor-pointer rounded-sm border p-4 transition"
              :class="
                selectedTemplateId === template.id
                  ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                  : 'border-zinc-200 hover:border-zinc-400'
              "
            >
              <input
                v-model="selectedTemplateId"
                type="radio"
                name="template"
                :value="template.id"
                class="sr-only"
              />
              <span class="block pr-7 font-semibold">{{ template.name }}</span>
              <span class="mt-1 block text-xs leading-5 text-zinc-500">
                {{ template.description || '설명 없음' }}
              </span>
              <span class="mt-4 block font-mono text-[10px] uppercase text-zinc-500">
                {{ template.groups.length }} groups ·
                {{ template.groups.reduce((sum, group) => sum + group.items.length, 0) }} items
              </span>
              <CheckCircle2
                v-if="selectedTemplateId === template.id"
                class="absolute right-4 top-4 size-5 text-emerald-600"
              />
            </label>
          </div>
        </section>

        <section v-if="draftGroups.length" class="space-y-3">
          <div
            class="flex items-center gap-3 rounded-md border border-zinc-300 bg-white px-5 py-4 shadow-sm"
          >
            <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white">
              <PencilRuler class="size-4" />
            </span>
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                03 / final review
              </p>
              <h2 class="font-semibold">이 BAY의 최종 작업 구성</h2>
              <p class="mt-1 text-xs text-zinc-500">
                여기서 수정한 내용은 원본 템플릿에 영향을 주지 않습니다.
              </p>
            </div>
          </div>
          <TemplateGroupEditor v-model:groups="draftGroups" />
        </section>

        <div
          v-if="invalidGroupCount || emptyItemCount"
          class="flex gap-3 rounded-sm border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <TriangleAlert class="size-5 shrink-0" />
          <p>
            작업명 미입력 그룹 {{ invalidGroupCount }}개, 완전히 빈 상세 작업
            {{ emptyItemCount }}개를 확인하세요.
          </p>
        </div>
      </div>

      <aside
        class="h-fit rounded-md border border-zinc-800 bg-zinc-950 text-white lg:sticky lg:top-5"
      >
        <div class="border-b border-zinc-800 p-5">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
            Creation summary
          </p>
          <h2 class="mt-2 text-lg font-semibold">생성 준비</h2>
        </div>
        <dl class="grid grid-cols-2 border-b border-zinc-800">
          <div class="border-r border-zinc-800 p-4">
            <dt class="text-xs text-zinc-500">그룹</dt>
            <dd class="mt-1 text-2xl font-semibold">{{ groupCount }}</dd>
          </div>
          <div class="p-4">
            <dt class="text-xs text-zinc-500">상세 작업</dt>
            <dd class="mt-1 text-2xl font-semibold">{{ itemCount }}</dd>
          </div>
        </dl>
        <div class="border-b border-zinc-800 p-4">
          <p class="flex items-center justify-between gap-3 text-xs text-zinc-400">
            <span class="flex items-center gap-2"
              ><ShieldAlert class="size-4 text-amber-300" /> 고소작업</span
            >
            <strong class="text-base text-amber-200">{{ highAltitudeCount }}</strong>
          </p>
        </div>
        <div class="p-5">
          <p class="text-sm font-semibold">{{ selectedTemplate?.name || '템플릿을 선택하세요' }}</p>
          <p class="mt-2 text-xs leading-5 text-zinc-500">
            선택한 템플릿을 복사한 뒤 현재 편집 결과 전체를 하나의 트랜잭션으로 저장합니다.
          </p>
          <p
            v-if="submitError"
            class="mt-4 flex gap-2 rounded-sm bg-red-950 p-3 text-xs text-red-200"
          >
            <TriangleAlert class="size-4 shrink-0" />{{ submitError }}
          </p>
          <button
            type="button"
            :disabled="!canSubmit"
            class="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-emerald-400 px-4 text-sm font-bold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            @click="createBay"
          >
            <Loader2 v-if="submitPending" class="size-4 animate-spin" />
            {{ submitPending ? '생성 중' : 'BAY 생성' }}
          </button>
        </div>
      </aside>
    </div>
  </main>
</template>
