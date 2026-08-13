<script setup lang="ts">
import { ArrowLeft, CheckCircle2, Copy, Loader2, Plus, Save } from '@lucide/vue'
import PackingListEditor from '@/components/packing/PackingListEditor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  clonePackingSections,
  createBlankPackingSections,
  fetchPackingTemplates,
} from '@/composables/usePackingLists'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { PackingSectionDraft, PackingTemplateDraft } from '@/types/packing'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})
useHead({ title: '새 패킹 템플릿 · Capacity Planner' })

const auth = useAuthStore()
const route = useRoute()
const name = ref('')
const description = ref('')
const source = ref<'blank' | 'clone'>('blank')
const sourceTemplateId = ref('')
const templates = ref<PackingTemplateDraft[]>([])
const sections = ref<PackingSectionDraft[]>(createBlankPackingSections())
const loading = ref(true)
const pending = ref(false)
const errorMessage = ref<string | null>(null)
const savedName = ref<string | null>(null)

const invalid = computed(
  () =>
    name.value.trim().length < 2 ||
    sections.value.length === 0 ||
    sections.value.some(
      section => !section.name.trim() || section.rows.some(row => !row.label.trim()),
    ),
)

function applySource(next: 'blank' | 'clone') {
  source.value = next
  if (next === 'blank') {
    sections.value = createBlankPackingSections()
    return
  }
  const template =
    templates.value.find(candidate => candidate.id === sourceTemplateId.value) ?? templates.value[0]
  if (!template) return
  sourceTemplateId.value = template.id
  sections.value = clonePackingSections(template.sections)
  if (!name.value.trim()) name.value = `${template.name} 복제본`
}

function applySelectedTemplate() {
  const template = templates.value.find(candidate => candidate.id === sourceTemplateId.value)
  if (template) sections.value = clonePackingSections(template.sections)
}

async function save() {
  if (invalid.value || pending.value) return
  pending.value = true
  errorMessage.value = null
  try {
    const created = await $fetch<{ name: string }>('/api/packing-list-templates', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        description: description.value.trim(),
        sections: clonePackingSections(sections.value),
      },
    })
    savedName.value = created.name
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹 템플릿을 저장하지 못했습니다.')
  } finally {
    pending.value = false
  }
}

onMounted(async () => {
  try {
    await auth.initialize()
    templates.value = await fetchPackingTemplates()
    sourceTemplateId.value = templates.value[0]?.id ?? ''
    const requestedSource = typeof route.query.source === 'string' ? route.query.source : ''
    const requestedTemplate = templates.value.find(template => template.id === requestedSource)
    if (requestedTemplate) {
      sourceTemplateId.value = requestedTemplate.id
      applySource('clone')
    }
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹 템플릿을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="min-h-full bg-[#edf2ee] px-6 py-8 text-zinc-950">
    <div class="mx-auto max-w-[92rem]">
      <div class="flex items-center justify-between">
        <NuxtLink
          to="/admin/packing-templates"
          class="flex items-center gap-2 text-sm font-semibold text-zinc-600"
          ><ArrowLeft class="size-4" /> 패킹 리스트 관리</NuxtLink
        >
        <NuxtLink to="/admin/bays/new" class="text-sm font-semibold text-emerald-700"
          >BAY 생성으로 이동</NuxtLink
        >
      </div>

      <section
        v-if="savedName"
        class="mx-auto mt-14 max-w-2xl rounded-lg border border-emerald-300 bg-white p-10 text-center shadow-xl"
      >
        <CheckCircle2 class="mx-auto size-12 text-emerald-600" />
        <h1 class="mt-4 text-2xl font-semibold">{{ savedName }} 패킹 템플릿을 저장했습니다.</h1>
        <p class="mt-2 text-sm text-zinc-600">
          이제 BAY 생성 시 이 템플릿을 복사해 사용할 수 있습니다.
        </p>
        <div class="mt-6 flex justify-center gap-2">
          <Button as-child variant="outline"
            ><NuxtLink to="/admin/packing-templates">관리 목록</NuxtLink></Button
          >
          <Button as-child><NuxtLink to="/admin/bays/new">BAY 생성</NuxtLink></Button>
        </div>
      </section>

      <template v-else>
        <header class="mt-8">
          <p class="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-700">
            Packing blueprint
          </p>
          <h1 class="mt-2 text-3xl font-semibold">재사용할 패킹리스트 구조를 만듭니다.</h1>
        </header>

        <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="space-y-5">
            <section class="rounded-lg border bg-white p-5 shadow-sm">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-2 text-xs font-semibold"
                  >템플릿명<Input v-model="name" placeholder="예: 기본 장비 패킹"
                /></label>
                <label class="grid gap-2 text-xs font-semibold"
                  >설명<Input v-model="description" placeholder="사용 목적"
                /></label>
              </div>
            </section>

            <section class="rounded-lg border bg-white p-5 shadow-sm">
              <h2 class="text-sm font-semibold">시작 방식</h2>
              <div class="mt-3 flex gap-2">
                <Button
                  type="button"
                  :variant="source === 'blank' ? 'solid' : 'outline'"
                  @click="applySource('blank')"
                  ><Plus /> 빈 템플릿</Button
                >
                <Button
                  type="button"
                  :variant="source === 'clone' ? 'solid' : 'outline'"
                  :disabled="templates.length === 0"
                  @click="applySource('clone')"
                  ><Copy /> 기존 복제</Button
                >
              </div>
              <select
                v-if="source === 'clone'"
                v-model="sourceTemplateId"
                class="mt-3 h-10 w-full max-w-md rounded-md border bg-white px-3 text-sm"
                @change="applySelectedTemplate"
              >
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ template.name }}
                </option>
              </select>
              <p v-if="loading" class="mt-3 flex items-center text-xs text-zinc-500">
                <Loader2 class="mr-2 size-4 animate-spin" /> 기존 템플릿 확인 중
              </p>
            </section>

            <PackingListEditor v-model="sections" />
          </div>

          <aside class="h-fit rounded-lg border bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <h2 class="font-semibold">저장 요약</h2>
            <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-md bg-zinc-100 p-3">
                <dt class="text-xs text-zinc-500">섹션</dt>
                <dd class="mt-1 text-xl font-semibold">{{ sections.length }}</dd>
              </div>
              <div class="rounded-md bg-zinc-100 p-3">
                <dt class="text-xs text-zinc-500">항목</dt>
                <dd class="mt-1 text-xl font-semibold">
                  {{ sections.reduce((sum, section) => sum + section.rows.length, 0) }}
                </dd>
              </div>
            </dl>
            <p v-if="errorMessage" class="mt-4 text-sm text-red-700">{{ errorMessage }}</p>
            <Button
              type="button"
              class="mt-5 w-full"
              :disabled="invalid"
              :loading="pending"
              @click="save"
              ><Save /> 템플릿 저장</Button
            >
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
