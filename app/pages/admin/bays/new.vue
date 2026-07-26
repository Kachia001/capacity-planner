<script setup lang="ts">
import BayCreationPageHeader from '@/pages/admin/bays/components/BayCreationPageHeader.vue'
import BayCreationSuccess from '@/pages/admin/bays/components/BayCreationSuccess.vue'
import BayCreationSummary from '@/pages/admin/bays/components/BayCreationSummary.vue'
import BayIdentitySection from '@/pages/admin/bays/components/BayIdentitySection.vue'
import BayStartMethodSection from '@/pages/admin/bays/components/BayStartMethodSection.vue'
import BayWorkConfigurationSection from '@/pages/admin/bays/components/BayWorkConfigurationSection.vue'
import {
  cloneTemplateGroups,
  createBlankTemplateGroups,
  fetchBayTemplates,
} from '@/composables/useBayTemplates'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { ExistingTemplateDraft, TemplateGroupDraft } from '@/types/template'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: '새 BAY 만들기 · Capacity Planner' })

const auth = useAuthStore()
const planner = usePlannerStore()
const directWriteId = 'direct-write'
const bayCode = ref('')
const bayDescription = ref('')
const templates = ref<ExistingTemplateDraft[]>([])
const selectedTemplateId = ref(directWriteId)
const draftGroups = ref<TemplateGroupDraft[]>(createBlankTemplateGroups())
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
  isDirectWrite.value ? '직접 작성' : (selectedTemplate.value?.name ?? '시작 방식을 선택하세요'),
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
    (isDirectWrite.value || Boolean(selectedTemplate.value)) &&
    groupCount.value > 0 &&
    invalidGroupCount.value === 0 &&
    emptyItemCount.value === 0 &&
    !submitPending.value,
)

function applySelectedTemplate(templateId: string) {
  if (templateId === directWriteId) {
    draftGroups.value = createBlankTemplateGroups()
    return
  }

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
  <main class="min-h-full text-zinc-950">
    <BayCreationPageHeader />

    <BayCreationSuccess
      v-if="created"
      :bay-code="bayCode"
      :item-count="itemCount"
      :high-altitude-count="highAltitudeCount"
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
        <BayStartMethodSection
          v-model:selected-template-id="selectedTemplateId"
          :templates="templates"
          :direct-write-id="directWriteId"
          :loading="loading"
          :load-error="loadError"
        />
        <BayWorkConfigurationSection
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
        :is-direct-write="isDirectWrite"
        :submit-error="submitError"
        :submit-pending="submitPending"
        :can-submit="canSubmit"
        @create="createBay"
      />
    </div>
  </main>
</template>
