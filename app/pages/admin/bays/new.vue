<script setup lang="ts">
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FilePlus2,
  Layers3,
  Library,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from '@lucide/vue'
import TemplateGroupEditor from '@/components/admin/bay-wizard/TemplateGroupEditor.vue'
import WizardActions from '@/components/admin/bay-wizard/WizardActions.vue'
import WizardHeader from '@/components/admin/bay-wizard/WizardHeader.vue'
import WizardStepRail from '@/components/admin/bay-wizard/WizardStepRail.vue'
import type {
  BayWizardStep,
  BayDraftPayload,
  DraftSaveState,
  ExistingTemplateDraft,
  TemplateMode,
  TemplateSource,
  TemplateGroupDraft,
  TemplateItemDraft,
} from '@/types/template'

definePageMeta({
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})

useHead({
  title: '새 BAY 만들기 · Capacity Planner',
})

const auth = useAuthStore()
const planner = usePlannerStore()

const steps: BayWizardStep[] = [
  { number: 1, eyebrow: 'Identity', label: 'BAY 정보', description: '운영 단위를 식별합니다.' },
  { number: 2, eyebrow: 'Blueprint', label: '템플릿 방식', description: '기존 또는 신규 구성을 선택합니다.' },
  { number: 3, eyebrow: 'Configure', label: '작업 구성', description: '그룹과 작업 순서를 확인합니다.' },
  { number: 4, eyebrow: 'Commission', label: '검토 및 생성', description: '생성 전 최종 내용을 검토합니다.' },
]

const currentStep = ref(1)
const furthestStep = ref(1)
const headingRef = ref<HTMLElement | null>(null)
const bayCode = ref('')
const bayDescription = ref('')
const templateMode = ref<TemplateMode | null>(null)
const newTemplateSource = ref<TemplateSource>('clone')
const selectedTemplateId = ref('')
const newTemplateName = ref('')
const newTemplateDescription = ref('')
const draftGroups = ref<TemplateGroupDraft[]>([])
const existingTemplates = ref<ExistingTemplateDraft[]>([])
const templateLoading = ref(true)
const templateLoadError = ref<string | null>(null)
const stepError = ref<string | null>(null)
const draftSaveState = ref<DraftSaveState>('idle')
const draftSavedAt = ref<string | null>(null)
const submitted = ref(false)
const submitPending = ref(false)
const preparedPayload = ref<BayDraftPayload | null>(null)
let draftSaveTimer: ReturnType<typeof setTimeout> | undefined
let generatedId = 0

function makeClientId(prefix: string) {
  generatedId += 1
  return `${prefix}-${Date.now()}-${generatedId}`
}

function cloneItem(item: TemplateItemDraft, itemIndex: number): TemplateItemDraft {
  return {
    ...item,
    clientId: makeClientId('item'),
    sortOrder: itemIndex + 1,
    legacySourceRow: item.legacySourceRow,
  }
}

function cloneGroups(groups: TemplateGroupDraft[]) {
  return groups.map((group, groupIndex) => ({
    ...group,
    clientId: makeClientId('group'),
    sortOrder: groupIndex + 1,
    items: group.items.map(cloneItem),
  }))
}

function blankGroups(): TemplateGroupDraft[] {
  return [{
    clientId: makeClientId('group'),
    sortOrder: 1,
    kind: 'work',
    workNo: null,
    workName: '',
    items: [{
      clientId: makeClientId('item'),
      sortOrder: 1,
      legacySourceRow: null,
      workDetail: '',
      vendor: '',
      partNo: '',
      itemName: '',
      bolt: '',
    }],
  }]
}

const selectedTemplate = computed(() =>
  existingTemplates.value.find(template => template.id === selectedTemplateId.value) ?? null,
)

const activeGroups = computed(() =>
  draftGroups.value,
)

const activeGroupCount = computed(() => activeGroups.value.length)
const activeItemCount = computed(() =>
  activeGroups.value.reduce((total, group) => total + group.items.length, 0),
)

const currentStepMeta = computed(() => steps[currentStep.value - 1] ?? steps[0]!)

const bayCodeHint = computed(() => {
  const code = bayCode.value.trim()

  if (!code) {
    return '영문, 숫자, 하이픈과 밑줄을 사용할 수 있습니다.'
  }

  if (!/^[A-Za-z0-9_-]{2,40}$/.test(code)) {
    return '2–40자의 영문, 숫자, 하이픈 또는 밑줄로 입력하세요.'
  }

  if (planner.baySummaries.some(summary => summary.bay.toLocaleLowerCase() === code.toLocaleLowerCase())) {
    return '현재 데이터에 이미 존재하는 BAY 코드입니다.'
  }

  return '현재 데이터 기준으로 사용할 수 있는 코드입니다.'
})

const bayCodeAvailable = computed(() => {
  const code = bayCode.value.trim()
  return /^[A-Za-z0-9_-]{2,40}$/.test(code)
    && !planner.baySummaries.some(summary => summary.bay.toLocaleLowerCase() === code.toLocaleLowerCase())
})

const invalidGroupCount = computed(() => draftGroups.value.filter(group =>
  (group.kind === 'work' && !group.workName.trim()) || group.items.length === 0,
).length)

const emptyItemCount = computed(() => draftGroups.value.reduce(
  (total, group) => total + group.items.filter(item =>
    item.legacySourceRow === null && ![
      item.workDetail,
      item.vendor,
      item.partNo,
      item.itemName,
      item.bolt,
    ].some(value => value.trim()),
  ).length,
  0,
))

function chooseTemplateMode(mode: TemplateMode) {
  templateMode.value = mode
  stepError.value = null

  if (mode === 'existing' && !selectedTemplateId.value) {
    selectedTemplateId.value = existingTemplates.value[0]?.id ?? ''
  }

  if (mode === 'existing' && selectedTemplate.value) {
    draftGroups.value = cloneGroups(selectedTemplate.value.groups)
  }

  if (mode === 'new' && draftGroups.value.length === 0) {
    applyNewTemplateSource(newTemplateSource.value)
  }
}

function applyNewTemplateSource(source: TemplateSource) {
  newTemplateSource.value = source
  const baseTemplate = selectedTemplate.value ?? existingTemplates.value[0]
  draftGroups.value = source === 'clone' && baseTemplate
    ? cloneGroups(baseTemplate.groups)
    : blankGroups()

  if (!newTemplateName.value) {
    newTemplateName.value = source === 'clone' && baseTemplate
      ? `${baseTemplate.name} 복제본`
      : `${bayCode.value.trim() || '신규 BAY'} 작업 템플릿`
  }
}

function validateStep(step: number) {
  stepError.value = null

  if (step === 1 && !bayCodeAvailable.value) {
    stepError.value = '사용 가능한 BAY 코드를 먼저 입력하세요.'
    return false
  }

  if (step === 2 && !templateMode.value) {
    stepError.value = 'BAY에 적용할 템플릿 방식을 선택하세요.'
    return false
  }

  if (step === 3 && templateMode.value === 'existing' && !selectedTemplate.value) {
    stepError.value = '사용할 기존 템플릿을 선택하세요.'
    return false
  }

  if (step === 3) {
    if (draftGroups.value.length === 0) {
      stepError.value = '최소 1개의 작업 그룹이 필요합니다.'
      return false
    }

    if (invalidGroupCount.value > 0 || emptyItemCount.value > 0) {
      stepError.value = `작업명 미입력 그룹 ${invalidGroupCount.value}개, 완전히 빈 상세 작업 ${emptyItemCount.value}개를 확인하세요.`
      return false
    }
  }

  return true
}

async function focusStepHeading() {
  await nextTick()
  headingRef.value?.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function nextStep() {
  if (!validateStep(currentStep.value)) {
    return
  }

  if (currentStep.value < 4) {
    currentStep.value += 1
    furthestStep.value = Math.max(furthestStep.value, currentStep.value)
    await focusStepHeading()
  }
}

async function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value -= 1
    stepError.value = null
    await focusStepHeading()
  }
}

async function goToCompletedStep(step: number) {
  if (step > furthestStep.value || step === currentStep.value) {
    return
  }

  currentStep.value = step
  stepError.value = null
  await focusStepHeading()
}

function buildPayload(): BayDraftPayload | null {
  if (!templateMode.value) {
    return null
  }

  const bay = {
    code: bayCode.value.trim(),
    description: bayDescription.value.trim(),
  }

  return {
    bay,
    groups: cloneGroups(draftGroups.value),
  }
}

function persistDraft() {
  if (!import.meta.client) {
    return
  }

  draftSaveState.value = 'saving'
  const snapshot = {
    currentStep: currentStep.value,
    bayCode: bayCode.value,
    bayDescription: bayDescription.value,
    templateMode: templateMode.value,
    newTemplateSource: newTemplateSource.value,
    selectedTemplateId: selectedTemplateId.value,
    newTemplateName: newTemplateName.value,
    newTemplateDescription: newTemplateDescription.value,
    draftGroups: draftGroups.value,
  }

  window.localStorage.setItem('capacity-planner:bay-wizard-draft', JSON.stringify(snapshot))
  draftSavedAt.value = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
  draftSaveState.value = 'saved'
}

function scheduleDraftSave() {
  if (!import.meta.client || submitted.value) {
    return
  }

  draftSaveState.value = 'saving'
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
  }

  draftSaveTimer = setTimeout(persistDraft, 800)
}

async function prepareCreation() {
  if (!validateStep(3)) {
    currentStep.value = 3
    return
  }

  const payload = buildPayload()
  if (!payload) {
    return
  }

  submitPending.value = true
  stepError.value = null
  try {
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    await $fetch('/api/bays', {
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    preparedPayload.value = payload
    submitted.value = true
    window.localStorage.removeItem('capacity-planner:bay-wizard-draft')
    await planner.loadWorkItems()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    stepError.value = error instanceof Error ? error.message : 'BAY를 생성하지 못했습니다.'
  } finally {
    submitPending.value = false
  }
}

function resetWizard() {
  currentStep.value = 1
  furthestStep.value = 1
  bayCode.value = ''
  bayDescription.value = ''
  templateMode.value = null
  newTemplateSource.value = 'clone'
  selectedTemplateId.value = existingTemplates.value[0]?.id ?? ''
  newTemplateName.value = ''
  newTemplateDescription.value = ''
  draftGroups.value = []
  submitted.value = false
  preparedPayload.value = null
  stepError.value = null
}

watch([
  bayCode,
  bayDescription,
  templateMode,
  newTemplateSource,
  selectedTemplateId,
  newTemplateName,
  newTemplateDescription,
  draftGroups,
], scheduleDraftSave, { deep: true })

onMounted(async () => {
  templateLoading.value = true
  templateLoadError.value = null

  try {
    await auth.initialize()
    await planner.loadWorkItems()
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    const templates = await $fetch<Array<{
      id: string
      name: string
      description: string
      updatedAt: string
      rows: Array<Omit<TemplateItemDraft, 'clientId' | 'legacySourceRow'> & { workNo: number | null, workName: string | null }>
    }>>('/api/bay-templates', { headers: { Authorization: `Bearer ${accessToken}` } })

    existingTemplates.value = templates.map(template => {
      const groups: TemplateGroupDraft[] = []
      for (const row of template.rows) {
        const key = row.workName?.trim() || '__material__'
        let group = groups.at(-1)
        if (!group || (group.workName || '__material__') !== key) {
          group = { clientId: makeClientId('group'), sortOrder: groups.length + 1, kind: row.workName ? 'work' : 'material', workNo: row.workNo, workName: row.workName ?? '', items: [] }
          groups.push(group)
        }
        group.items.push({ clientId: makeClientId('item'), sortOrder: group.items.length + 1, legacySourceRow: null, workDetail: row.workDetail ?? '', vendor: row.vendor ?? '', partNo: row.partNo ?? '', itemName: row.itemName ?? '', bolt: row.bolt ?? '' })
      }
      return { id: template.id, name: template.name, description: template.description, sourceBay: '템플릿', updatedAtLabel: new Date(template.updatedAt).toLocaleDateString('ko-KR'), usedByBayCount: 0, groups }
    })
    selectedTemplateId.value = existingTemplates.value[0]?.id ?? ''
    if (existingTemplates.value[0]) draftGroups.value = cloneGroups(existingTemplates.value[0].groups)
  } catch (error) {
    templateLoadError.value = error instanceof Error ? error.message : '기존 템플릿을 불러오지 못했습니다.'
  } finally {
    templateLoading.value = false
  }
})

onBeforeUnmount(() => {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
  }
})
</script>

<template>
  <div class="bay-commissioning min-h-full bg-[#edf2ee] text-zinc-950">
    <WizardHeader :current-step="currentStep" :group-count="activeGroupCount" :item-count="activeItemCount" :save-state="draftSaveState" :saved-at="draftSavedAt" />

    <div v-if="submitted" class="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16 sm:px-6 lg:px-8">
      <section class="relative w-full overflow-hidden rounded-md border border-emerald-300 bg-white p-6 shadow-[0_24px_80px_-42px_rgba(6,95,70,0.6)] sm:p-10">
        <div class="absolute right-0 top-0 h-full w-2 bg-emerald-500" />
        <div class="flex size-14 items-center justify-center rounded-sm bg-emerald-500 text-white shadow-lg shadow-emerald-900/15">
          <CheckCircle2 class="size-7" />
        </div>
        <p class="mt-7 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
          BAY created
        </p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          {{ preparedPayload?.bay.code }} 생성이 완료되었습니다.
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          최종 편집한 작업 구성이 독립적인 BAY 작업 목록으로 저장되었습니다.
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div class="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
            <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">BAY code</span>
            <strong class="mt-2 block font-mono text-base">{{ preparedPayload?.bay.code }}</strong>
          </div>
          <div class="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
            <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Starting point</span>
            <strong class="mt-2 block text-base">{{ templateMode === 'existing' ? '기존 템플릿' : '사용자 구성' }}</strong>
          </div>
          <div class="rounded-sm border border-zinc-200 bg-zinc-50 p-4">
            <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Work items</span>
            <strong class="mt-2 block text-base">{{ activeItemCount }}개</strong>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex h-11 items-center gap-2 rounded-sm bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            @click="resetWizard"
          >
            <RotateCcw class="size-4" /> 다른 BAY 구성
          </button>
          <NuxtLink
            to="/"
            class="inline-flex h-11 items-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Dashboard로 돌아가기 <ArrowRight class="size-4" />
          </NuxtLink>
        </div>
      </section>
    </div>

    <div v-else class="mx-auto grid w-full max-w-[92rem] gap-5 px-4 py-6 pb-28 sm:px-6 lg:px-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside class="self-start rounded-md border border-zinc-300 bg-[#f7f9f6] shadow-sm xl:sticky xl:top-5">
        <div class="border-b border-zinc-300 px-4 py-4">
          <p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Process rail</p>
          <p class="mt-1 text-sm font-semibold">BAY 생성 단계</p>
        </div>
        <ol aria-label="BAY 생성 단계" class="grid grid-cols-4 xl:grid-cols-1">
          <li v-for="step in steps" :key="step.number" class="relative border-r border-zinc-200 last:border-r-0 xl:border-b xl:border-r-0 xl:last:border-b-0">
            <button
              type="button"
              class="group flex h-full w-full flex-col gap-2 px-3 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 xl:flex-row xl:items-start xl:gap-3 xl:px-4"
              :class="step.number === currentStep
                ? 'bg-zinc-950 text-white'
                : step.number < currentStep || step.number <= furthestStep
                  ? 'text-zinc-800 hover:bg-white'
                  : 'cursor-not-allowed text-zinc-400'"
              :disabled="step.number > furthestStep"
              :aria-current="step.number === currentStep ? 'step' : undefined"
              @click="goToCompletedStep(step.number)"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-[11px] font-bold"
                :class="step.number === currentStep
                  ? 'border-emerald-400 text-emerald-300'
                  : step.number < currentStep
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-zinc-300 bg-white text-zinc-500'"
              >
                <Check v-if="step.number < currentStep" class="size-4" />
                <template v-else>{{ String(step.number).padStart(2, '0') }}</template>
              </span>
              <span class="min-w-0">
                <span class="hidden font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-60 xl:block">{{ step.eyebrow }}</span>
                <span class="mt-0.5 block text-xs font-semibold sm:text-sm">{{ step.label }}</span>
                <span class="mt-1 hidden text-xs leading-5 opacity-60 xl:block">{{ step.description }}</span>
              </span>
            </button>
          </li>
        </ol>

        <div class="hidden border-t border-zinc-300 p-4 xl:block">
          <div class="flex items-start gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
            <ShieldCheck class="mt-0.5 size-4 shrink-0" />
            <p class="text-xs leading-5">
              템플릿은 시작점으로만 사용되며, 최종 편집 결과는 독립적인 BAY 작업 목록으로 저장됩니다.
            </p>
          </div>
        </div>
      </aside>

      <section class="min-w-0">
        <div class="mb-5 flex items-start gap-4">
          <span class="hidden size-12 shrink-0 items-center justify-center rounded-sm bg-emerald-500 font-mono text-sm font-bold text-white shadow-lg shadow-emerald-950/10 sm:flex">
            {{ String(currentStep).padStart(2, '0') }}
          </span>
          <div>
            <p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">{{ currentStepMeta.eyebrow }}</p>
            <h2 ref="headingRef" tabindex="-1" class="mt-1 text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
              {{ currentStepMeta.label }}
            </h2>
            <p class="mt-1 text-sm leading-6 text-zinc-600">{{ currentStepMeta.description }}</p>
          </div>
        </div>

        <div v-if="stepError" role="alert" class="mb-4 flex items-start gap-3 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <TriangleAlert class="mt-0.5 size-4 shrink-0" />
          <span>{{ stepError }}</span>
        </div>

        <div v-if="currentStep === 1" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div class="rounded-md border border-zinc-300 bg-white p-5 shadow-sm sm:p-7">
            <div class="max-w-2xl">
              <span class="inline-flex items-center gap-2 rounded-sm bg-zinc-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                <Database class="size-3.5" /> Operating identity
              </span>
              <h3 class="mt-5 text-xl font-semibold">새 운영 단위를 식별하세요.</h3>
              <p class="mt-2 text-sm leading-6 text-zinc-600">
                BAY 코드는 대시보드, 작업 상태, 이력에서 공통으로 사용하는 고유 식별자입니다.
              </p>
            </div>

            <div class="mt-8 grid gap-5">
              <label class="grid gap-2">
                <span class="text-sm font-semibold text-zinc-800">BAY 코드 <span class="text-red-600">*</span></span>
                <div class="relative">
                  <input
                    v-model="bayCode"
                    autofocus
                    type="text"
                    maxlength="40"
                    autocomplete="off"
                    aria-describedby="bay-code-hint"
                    class="h-14 w-full rounded-sm border bg-white px-4 pr-12 font-mono text-lg font-semibold uppercase tracking-[0.06em] outline-none transition"
                    :class="bayCode && bayCodeAvailable
                      ? 'border-emerald-500 focus:ring-4 focus:ring-emerald-100'
                      : bayCode
                        ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-zinc-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'"
                    placeholder="BAY19_11978"
                  >
                  <CheckCircle2 v-if="bayCode && bayCodeAvailable" class="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-emerald-600" />
                  <TriangleAlert v-else-if="bayCode" class="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-red-500" />
                </div>
                <span
                  id="bay-code-hint"
                  class="flex items-center gap-2 text-xs"
                  :class="bayCode && !bayCodeAvailable ? 'text-red-700' : bayCodeAvailable ? 'text-emerald-700' : 'text-zinc-500'"
                >
                  {{ bayCodeHint }}
                </span>
              </label>

              <label class="grid gap-2">
                <span class="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-800">
                  설명 <span class="text-xs font-normal text-zinc-400">선택</span>
                </span>
                <textarea
                  v-model="bayDescription"
                  rows="4"
                  maxlength="300"
                  class="resize-y rounded-sm border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  placeholder="생산 라인, 대상 설비 또는 운영 메모를 입력하세요."
                />
                <span class="text-right font-mono text-[10px] text-zinc-400">{{ bayDescription.length }}/300</span>
              </label>
            </div>
          </div>

          <aside class="overflow-hidden rounded-md border border-zinc-300 bg-zinc-950 text-white shadow-sm">
            <div class="border-b border-zinc-800 p-5">
              <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Naming protocol</p>
              <h3 class="mt-2 text-lg font-semibold">현장 코드 규칙</h3>
            </div>
            <div class="space-y-5 p-5 text-sm">
              <div>
                <span class="font-mono text-xs text-zinc-500">EXAMPLE / 01</span>
                <code class="mt-2 block rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-3 font-mono text-emerald-300">BAY19_11978</code>
              </div>
              <ul class="space-y-3 text-xs leading-5 text-zinc-400">
                <li class="flex gap-2"><Check class="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> 현재 BAY와 중복되지 않는 코드</li>
                <li class="flex gap-2"><Check class="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> 화면과 로그에서 읽기 쉬운 규칙</li>
                <li class="flex gap-2"><Check class="mt-0.5 size-3.5 shrink-0 text-emerald-400" /> 생성 후 변경은 별도 관리 작업</li>
              </ul>
            </div>
          </aside>
        </div>

        <fieldset v-else-if="currentStep === 2" class="grid gap-5 lg:grid-cols-2">
          <legend class="sr-only">템플릿 방식 선택</legend>
          <label
            class="group relative cursor-pointer overflow-hidden rounded-md border-2 bg-white p-5 transition sm:p-7"
            :class="templateMode === 'existing'
              ? 'border-emerald-600 shadow-[0_18px_55px_-38px_rgba(5,150,105,0.9)]'
              : 'border-zinc-300 hover:-translate-y-0.5 hover:border-zinc-500 hover:shadow-lg'"
          >
            <input
              type="radio"
              name="template-mode"
              value="existing"
              class="sr-only"
              :checked="templateMode === 'existing'"
              @change="chooseTemplateMode('existing')"
            >
            <span class="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full border-2 transition" :class="templateMode === 'existing' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 bg-white'">
              <Check v-if="templateMode === 'existing'" class="size-4" />
            </span>
            <div class="flex size-12 items-center justify-center rounded-sm bg-zinc-950 text-emerald-300">
              <Library class="size-6" />
            </div>
            <div class="mt-8 flex items-center gap-2">
              <span class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Fast track</span>
              <span class="rounded-sm bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">권장</span>
            </div>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight">기존 템플릿 사용</h3>
            <p class="mt-3 max-w-lg text-sm leading-6 text-zinc-600">
              검증된 작업 구성을 선택해 새 BAY를 빠르게 준비합니다. 선택한 버전은 생성 시점에 고정됩니다.
            </p>
            <div class="mt-8 grid grid-cols-2 border-t border-zinc-200 pt-5 text-sm">
              <div>
                <span class="block font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400">Available</span>
                <strong class="mt-1 block">{{ existingTemplates.length }}개 템플릿</strong>
              </div>
              <div>
                <span class="block font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400">Current scale</span>
                <strong class="mt-1 block">{{ existingTemplates[0]?.groups.length ?? 0 }}개 그룹</strong>
              </div>
            </div>
          </label>

          <label
            class="group relative cursor-pointer overflow-hidden rounded-md border-2 bg-white p-5 transition sm:p-7"
            :class="templateMode === 'new'
              ? 'border-amber-500 shadow-[0_18px_55px_-38px_rgba(217,119,6,0.8)]'
              : 'border-zinc-300 hover:-translate-y-0.5 hover:border-zinc-500 hover:shadow-lg'"
          >
            <input
              type="radio"
              name="template-mode"
              value="new"
              class="sr-only"
              :checked="templateMode === 'new'"
              @change="chooseTemplateMode('new')"
            >
            <span class="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full border-2 transition" :class="templateMode === 'new' ? 'border-amber-500 bg-amber-500 text-zinc-950' : 'border-zinc-300 bg-white'">
              <Check v-if="templateMode === 'new'" class="size-4" />
            </span>
            <div class="flex size-12 items-center justify-center rounded-sm bg-amber-400 text-zinc-950">
              <FilePlus2 class="size-6" />
            </div>
            <p class="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Custom route</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight">작업 구성 직접 만들기</h3>
            <p class="mt-3 max-w-lg text-sm leading-6 text-zinc-600">
              workName 그룹과 하위 작업을 직접 구성합니다. 빈 구조 또는 현재 템플릿 복제로 시작할 수 있습니다.
            </p>
            <div class="mt-8 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-5">
              <button
                type="button"
                class="rounded-sm border px-3 py-3 text-left text-xs font-semibold transition"
                :class="newTemplateSource === 'clone' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-white'"
                @click.prevent="chooseTemplateMode('new'); applyNewTemplateSource('clone')"
              >
                <Copy class="mb-2 size-4" /> 기존 구성 복제
              </button>
              <button
                type="button"
                class="rounded-sm border px-3 py-3 text-left text-xs font-semibold transition"
                :class="newTemplateSource === 'blank' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-white'"
                @click.prevent="chooseTemplateMode('new'); applyNewTemplateSource('blank')"
              >
                <Plus class="mb-2 size-4" /> 빈 템플릿
              </button>
            </div>
          </label>
        </fieldset>

        <div v-else-if="currentStep === 3">
          <template v-if="templateMode === 'existing'">
            <div v-if="templateLoading" class="flex min-h-80 items-center justify-center rounded-md border border-zinc-300 bg-white text-sm text-zinc-500">
              <Loader2 class="mr-2 size-4 animate-spin" /> 기존 템플릿을 구성하는 중입니다.
            </div>
            <div v-else-if="templateLoadError" class="rounded-md border border-red-300 bg-red-50 p-5 text-red-900">
              <div class="flex items-start gap-3"><TriangleAlert class="mt-0.5 size-5" /><div><h3 class="font-semibold">템플릿을 불러오지 못했습니다.</h3><p class="mt-1 text-sm">{{ templateLoadError }}</p></div></div>
            </div>
            <div v-else class="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div class="rounded-md border border-zinc-300 bg-white p-3 shadow-sm">
                <p class="px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Published templates</p>
                <button
                  v-for="template in existingTemplates"
                  :key="template.id"
                  type="button"
                  class="mt-1 w-full rounded-sm border p-4 text-left transition"
                  :class="selectedTemplateId === template.id ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-white'"
                    @click="selectedTemplateId = template.id; draftGroups = cloneGroups(template.groups)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <span class="block truncate text-sm font-semibold">{{ template.name }}</span>
                      <span class="mt-1 block font-mono text-[10px]" :class="selectedTemplateId === template.id ? 'text-emerald-300' : 'text-emerald-700'">STARTING TEMPLATE</span>
                    </div>
                    <CheckCircle2 v-if="selectedTemplateId === template.id" class="size-5 shrink-0 text-emerald-300" />
                  </div>
                  <div class="mt-5 grid grid-cols-2 gap-2 text-xs" :class="selectedTemplateId === template.id ? 'text-zinc-300' : 'text-zinc-500'">
                    <span>{{ template.groups.length }}개 그룹</span>
                    <span>{{ template.groups.reduce((sum, group) => sum + group.items.length, 0) }}개 작업</span>
                    <span>사용 BAY {{ template.usedByBayCount }}</span>
                    <span>{{ template.updatedAtLabel }}</span>
                  </div>
                </button>
              </div>

              <div v-if="selectedTemplate" class="min-w-0">
                <div class="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                  {{ selectedTemplate.name }}에서 복사한 초안입니다. 아래 작업은 자유롭게 추가, 삭제, 수정할 수 있으며 원본 템플릿에는 영향을 주지 않습니다.
                </div>
                <TemplateGroupEditor v-model:groups="draftGroups" />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="mb-5 rounded-md border border-zinc-300 bg-white p-5 shadow-sm sm:p-6">
              <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="grid gap-2 text-sm font-semibold text-zinc-800">
                    구성 이름
                    <input
                      v-model="newTemplateName"
                      class="h-11 rounded-sm border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                      placeholder="예: 표준 조립 공정"
                    >
                  </label>
                  <label class="grid gap-2 text-sm font-semibold text-zinc-800">
                    설명
                    <input
                      v-model="newTemplateDescription"
                      class="h-11 rounded-sm border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                      placeholder="사용 목적 또는 적용 대상"
                    >
                  </label>
                </div>
                <div class="flex items-center gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4">
                  <Sparkles class="size-5 shrink-0 text-amber-700" />
                  <div>
                    <p class="text-xs font-semibold text-amber-950">{{ newTemplateSource === 'clone' ? '기존 구성에서 시작' : '빈 템플릿에서 시작' }}</p>
                    <button type="button" class="mt-1 text-xs font-medium text-amber-800 underline underline-offset-4" @click="applyNewTemplateSource(newTemplateSource === 'clone' ? 'blank' : 'clone')">
                      시작 방식 전환
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <TemplateGroupEditor v-model:groups="draftGroups" />
          </template>
        </div>

        <div v-else-if="currentStep === 4" class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="space-y-5">
            <section class="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div class="flex items-center gap-3">
                  <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white"><Database class="size-4" /></span>
                  <div><p class="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400">01 / identity</p><h3 class="font-semibold">BAY 정보</h3></div>
                </div>
                <button type="button" class="text-xs font-semibold text-emerald-700 hover:underline" @click="goToCompletedStep(1)">수정</button>
              </div>
              <div class="grid gap-4 p-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
                <div><span class="font-mono text-[10px] uppercase text-zinc-400">BAY code</span><strong class="mt-1 block font-mono text-lg">{{ bayCode }}</strong></div>
                <div><span class="font-mono text-[10px] uppercase text-zinc-400">Description</span><p class="mt-1 text-sm leading-6 text-zinc-700">{{ bayDescription || '설명 없음' }}</p></div>
              </div>
            </section>

            <section class="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div class="flex items-center gap-3">
                  <span class="flex size-9 items-center justify-center rounded-sm bg-zinc-950 text-white"><Layers3 class="size-4" /></span>
                  <div><p class="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400">02 / blueprint</p><h3 class="font-semibold">템플릿 구성</h3></div>
                </div>
                <button type="button" class="text-xs font-semibold text-emerald-700 hover:underline" @click="goToCompletedStep(3)">수정</button>
              </div>
              <div class="grid grid-cols-3 border-b border-zinc-200 bg-[#f7f9f6]">
                <div class="border-r border-zinc-200 p-4"><span class="font-mono text-[10px] uppercase text-zinc-400">Mode</span><strong class="mt-1 block text-sm">{{ templateMode === 'existing' ? '기존 템플릿에서 시작' : '사용자 구성' }}</strong></div>
                <div class="border-r border-zinc-200 p-4"><span class="font-mono text-[10px] uppercase text-zinc-400">Groups</span><strong class="mt-1 block text-xl">{{ activeGroupCount }}</strong></div>
                <div class="p-4"><span class="font-mono text-[10px] uppercase text-zinc-400">Items</span><strong class="mt-1 block text-xl">{{ activeItemCount }}</strong></div>
              </div>
              <div class="p-5">
                <h4 class="text-lg font-semibold">{{ templateMode === 'existing' ? selectedTemplate?.name : newTemplateName }}</h4>
                <p class="mt-1 text-sm text-zinc-500">최종 편집 결과를 독립적인 작업 목록으로 저장합니다.</p>
                <div class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div v-for="group in activeGroups.slice(0, 9)" :key="group.clientId" class="flex items-center gap-3 rounded-sm border border-zinc-200 px-3 py-3">
                    <span class="font-mono text-[10px] font-bold text-emerald-700">G{{ String(group.sortOrder).padStart(2, '0') }}</span>
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ group.workName || '자재 / 기타' }}</span>
                    <span class="font-mono text-[10px] text-zinc-400">{{ group.items.length }}</span>
                  </div>
                </div>
                <p v-if="activeGroups.length > 9" class="mt-3 text-xs text-zinc-500">외 {{ activeGroups.length - 9 }}개 그룹</p>
              </div>
            </section>
          </div>

          <aside class="self-start overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 text-white shadow-xl xl:sticky xl:top-5">
            <div class="border-b border-zinc-800 p-5">
              <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Commissioning check</p>
              <h3 class="mt-2 text-lg font-semibold">생성 시 처리 항목</h3>
            </div>
            <ol class="space-y-4 p-5 text-sm">
              <li class="flex gap-3"><span class="flex size-6 shrink-0 items-center justify-center rounded-sm border border-emerald-500 font-mono text-[10px] text-emerald-300">01</span><span><strong class="block text-zinc-100">최종 작업 구성 검증</strong><span class="mt-1 block text-xs leading-5 text-zinc-500">편집한 그룹과 작업 순서를 확인합니다.</span></span></li>
              <li class="flex gap-3"><span class="flex size-6 shrink-0 items-center justify-center rounded-sm border border-emerald-500 font-mono text-[10px] text-emerald-300">02</span><span><strong class="block text-zinc-100">BAY 레코드 생성</strong><span class="mt-1 block text-xs leading-5 text-zinc-500">고유 코드와 설명을 저장합니다.</span></span></li>
              <li class="flex gap-3"><span class="flex size-6 shrink-0 items-center justify-center rounded-sm border border-emerald-500 font-mono text-[10px] text-emerald-300">03</span><span><strong class="block text-zinc-100">작업 상태 초기화</strong><span class="mt-1 block text-xs leading-5 text-zinc-500">{{ activeItemCount }}개 작업을 진행 전으로 준비합니다.</span></span></li>
            </ol>
            <div class="border-t border-zinc-800 bg-zinc-900 p-5 text-xs leading-5 text-zinc-400">
              위 과정은 하나의 DB 트랜잭션으로 실행됩니다.
            </div>
          </aside>
        </div>
      </section>
    </div>

    <WizardActions v-if="!submitted" :current-step="currentStep" :template-mode="templateMode" @previous="previousStep" @next="nextStep" @submit="prepareCreation" />
  </div>
</template>

<style scoped>
.bay-commissioning {
  background-image:
    linear-gradient(rgba(39, 64, 49, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(39, 64, 49, 0.045) 1px, transparent 1px);
  background-size: 28px 28px;
}

@media (prefers-reduced-motion: reduce) {
  .bay-commissioning *,
  .bay-commissioning *::before,
  .bay-commissioning *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
