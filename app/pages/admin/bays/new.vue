<script setup lang="ts">
import BayCreationPageHeader from '@/pages/admin/bays/components/BayCreationPageHeader.vue'
import BayCreationSuccess from '@/pages/admin/bays/components/BayCreationSuccess.vue'
import BayCreationSummary from '@/pages/admin/bays/components/BayCreationSummary.vue'
import BayIdentitySection from '@/pages/admin/bays/components/BayIdentitySection.vue'
import BayTableAssignmentSection from '@/pages/admin/bays/components/BayTableAssignmentSection.vue'
import BayStartMethodSection from '@/pages/admin/bays/components/BayStartMethodSection.vue'
import BayWorkConfigurationSection from '@/pages/admin/bays/components/BayWorkConfigurationSection.vue'
import {
  cloneTemplateGroups,
  createBlankTemplateGroups,
  fetchBayTemplates,
} from '@/composables/useBayTemplates'
import { fetchWorkTables, getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { ExistingTemplateDraft, TemplateGroupDraft } from '@/types/template'
import type { WorkTableOverview } from '#shared/api/tables/table.contract'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})
useHead({ title: '새 BAY 만들기 · Capacity Planner' })

const auth = useAuthStore()
const planner = usePlannerStore()
const directWriteId = 'direct-write'
const bayCode = ref('')
const bayDescription = ref('')
const tableNumber = ref<number | null>(null)
const tables = ref<WorkTableOverview[]>([])
const templates = ref<ExistingTemplateDraft[]>([])
const selectedTemplateId = ref(directWriteId)
const draftGroups = ref<TemplateGroupDraft[]>(createBlankTemplateGroups())
const editingWorkConfiguration = ref(true)
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const submitPending = ref(false)
const created = ref(false)

const selectedTemplate = computed(
  () => templates.value.find(template => template.id === selectedTemplateId.value) ?? null,
)
const isDirectWrite = computed(() => selectedTemplateId.value === directWriteId)
const selectedStartLabel = computed(() =>
  isDirectWrite.value ? '직접 작성' : (selectedTemplate.value?.name ?? '생성 옵션을 선택하세요'),
)
const hasSelectedStartMethod = computed(
  () => isDirectWrite.value || Boolean(selectedTemplate.value),
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
    tableNumber.value !== null &&
    hasSelectedStartMethod.value &&
    (editingWorkConfiguration.value || !isDirectWrite.value) &&
    groupCount.value > 0 &&
    invalidGroupCount.value === 0 &&
    emptyItemCount.value === 0 &&
    !submitPending.value,
)

function applySelectedTemplate(templateId: string) {
  editingWorkConfiguration.value = templateId === directWriteId
  submitError.value = null

  if (!templateId) {
    draftGroups.value = []
    return
  }

  if (templateId === directWriteId) {
    draftGroups.value = createBlankTemplateGroups()
    return
  }

  const template = templates.value.find(candidate => candidate.id === templateId)
  draftGroups.value = template ? cloneTemplateGroups(template.groups) : []
}

watch(selectedTemplateId, applySelectedTemplate)

async function enterWorkConfiguration(templateId: string) {
  if (selectedTemplateId.value !== templateId) {
    selectedTemplateId.value = templateId
    await nextTick()
  }

  if (!hasSelectedStartMethod.value) return
  editingWorkConfiguration.value = true
}

async function loadTemplates() {
  loading.value = true
  loadError.value = null
  try {
    await auth.initialize()
    await planner.loadWorkItems()
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    const [nextTemplates, tableResponse] = await Promise.all([
      fetchBayTemplates(),
      fetchWorkTables(),
    ])
    templates.value = nextTemplates
    tables.value = tableResponse.tables
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '베이 생성 옵션을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function createBay() {
  if (!canSubmit.value) return
  submitPending.value = true
  submitError.value = null
  try {
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    await $fetch('/api/bays', {
      method: 'POST',
      body: {
        bay: {
          code: bayCode.value.trim(),
          description: bayDescription.value.trim(),
          tableNumber: tableNumber.value,
        },
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
  <main class="min-h-full text-zinc-950 mx-6">
    <BayCreationPageHeader
      bay-list-path="/admin/bays"
      template-create-path="/admin/bay-templates/new"
    />

    <BayCreationSuccess
      v-if="created"
      :bay-code="bayCode"
      :item-count="itemCount"
      :high-altitude-count="highAltitudeCount"
      bay-list-path="/admin/bays"
    />

    <div
      v-else
      class="mx-auto grid w-full gap-6 px-4 py-8 lg:px-0 xl:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div class="min-w-0 space-y-6">
        <BayIdentitySection
          v-model:bay-code="bayCode"
          v-model:bay-description="bayDescription"
          :code-available="codeAvailable"
        />
        <BayTableAssignmentSection
          v-model:table-number="tableNumber"
          :tables="tables"
          :loading="loading"
        />
        <BayStartMethodSection
          v-model:selected-template-id="selectedTemplateId"
          :templates="templates"
          :direct-write-id="directWriteId"
          :loading="loading"
          :load-error="loadError"
          :editing-work-configuration="editingWorkConfiguration"
          template-create-path="/admin/bay-templates/new"
          @edit-template="enterWorkConfiguration"
        />
        <BayWorkConfigurationSection
          v-if="editingWorkConfiguration"
          v-model:groups="draftGroups"
          :is-direct-write="isDirectWrite"
          :invalid-group-count="invalidGroupCount"
          :empty-item-count="emptyItemCount"
        />
      </div>

      <BayCreationSummary
        :group-count="groupCount"
        :item-count="itemCount"
        :high-altitude-count="highAltitudeCount"
        :selected-start-label="selectedStartLabel"
        :has-selected-start-method="hasSelectedStartMethod"
        :editing-work-configuration="editingWorkConfiguration"
        :is-direct-write="isDirectWrite"
        :submit-error="submitError"
        :submit-pending="submitPending"
        :can-submit="canSubmit"
        :table-number="tableNumber"
        @create="createBay"
      />
    </div>
  </main>
</template>
