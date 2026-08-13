<script setup lang="ts">
import {
  ClipboardList,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { fetchPackingTemplates } from '@/composables/usePackingLists'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { PackingTemplateDraft } from '@/types/packing'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})
useHead({ title: '패킹 리스트 관리 · Capacity Planner' })

const auth = useAuthStore()
const globalAlert = useGlobalAlertStore()
const templates = ref<PackingTemplateDraft[]>([])
const loading = ref(true)
const refreshing = ref(false)
const deletingId = ref<string | null>(null)
const query = ref('')
const errorMessage = ref<string | null>(null)

const filteredTemplates = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase()
  if (!keyword) return templates.value
  return templates.value.filter(
    template =>
      template.name.toLocaleLowerCase().includes(keyword) ||
      template.description.toLocaleLowerCase().includes(keyword) ||
      template.sections.some(section => section.name.toLocaleLowerCase().includes(keyword)),
  )
})
const totalSections = computed(() =>
  templates.value.reduce((sum, template) => sum + template.sections.length, 0),
)
const totalRows = computed(() =>
  templates.value.reduce(
    (sum, template) =>
      sum + template.sections.reduce((sectionSum, section) => sectionSum + section.rows.length, 0),
    0,
  ),
)

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

async function load(refresh = false) {
  if (refresh) refreshing.value = true
  else loading.value = true
  errorMessage.value = null
  try {
    await auth.initialize()
    templates.value = await fetchPackingTemplates()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹 템플릿을 불러오지 못했습니다.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function archiveTemplate(template: PackingTemplateDraft) {
  const accepted = await globalAlert.confirm({
    variant: 'destructive',
    title: `${template.name} 템플릿을 삭제할까요?`,
    message:
      '템플릿 관리 목록과 이후 Bay 할당 선택에서 제외됩니다. 이미 Bay에 복사된 패킹리스트에는 영향을 주지 않습니다.',
    confirmLabel: '템플릿 삭제',
    cancelLabel: '취소',
  })
  if (!accepted) return

  deletingId.value = template.id
  errorMessage.value = null
  try {
    await $fetch(`/api/packing-list-templates/${template.id}`, { method: 'DELETE' })
    templates.value = templates.value.filter(candidate => candidate.id !== template.id)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹 템플릿을 삭제하지 못했습니다.')
  } finally {
    deletingId.value = null
  }
}

onMounted(() => void load())
</script>

<template>
  <main class="mx-auto w-full max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 xl:px-10">
    <header class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
          Packing list control
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          패킹 리스트 템플릿을 관리합니다.
        </h1>
        <p class="mt-2 text-sm leading-6 text-zinc-600">
          표준 섹션과 항목을 만들고 수정하거나 기존 템플릿을 복제해 새로운 구성으로 사용할 수
          있습니다.
        </p>
      </div>
      <dl class="grid grid-cols-3 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div class="border-r px-5 py-3">
          <dt class="text-[10px] text-zinc-500">템플릿</dt>
          <dd class="mt-1 text-xl font-semibold">{{ templates.length }}</dd>
        </div>
        <div class="border-r px-5 py-3">
          <dt class="text-[10px] text-zinc-500">섹션</dt>
          <dd class="mt-1 text-xl font-semibold">{{ totalSections }}</dd>
        </div>
        <div class="px-5 py-3">
          <dt class="text-[10px] text-zinc-500">항목</dt>
          <dd class="mt-1 text-xl font-semibold">{{ totalRows }}</dd>
        </div>
      </dl>
    </header>

    <section class="mt-7 rounded-xl border border-zinc-300 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <label class="relative block w-full max-w-lg">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            v-model="query"
            type="search"
            placeholder="템플릿명, 설명, 섹션 검색"
            class="h-10 w-full rounded-md border border-zinc-300 pl-10 pr-3 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <div class="flex gap-2">
          <Button type="button" variant="outline" :loading="refreshing" @click="load(true)"
            ><RefreshCw /> 새로고침</Button
          >
          <Button as-child
            ><NuxtLink to="/admin/packing-templates/new"><Plus /> 새 템플릿</NuxtLink></Button
          >
        </div>
      </div>

      <div v-if="loading" class="flex min-h-64 items-center justify-center text-sm text-zinc-500">
        <Loader2 class="mr-2 size-5 animate-spin" /> 템플릿을 불러오는 중입니다.
      </div>
      <div
        v-else-if="errorMessage && templates.length === 0"
        class="flex min-h-64 flex-col items-center justify-center p-6 text-center text-red-700"
      >
        <TriangleAlert class="size-8" />
        <p class="mt-3 text-sm font-semibold">{{ errorMessage }}</p>
        <Button type="button" variant="outline" class="mt-4" @click="load()">다시 시도</Button>
      </div>
      <div
        v-else-if="filteredTemplates.length === 0"
        class="flex min-h-64 flex-col items-center justify-center text-center text-zinc-500"
      >
        <ClipboardList class="size-9" />
        <p class="mt-3 text-sm font-semibold">표시할 패킹 템플릿이 없습니다.</p>
        <Button as-child class="mt-4"
          ><NuxtLink to="/admin/packing-templates/new"><Plus /> 첫 템플릿 만들기</NuxtLink></Button
        >
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[60rem] border-collapse text-left text-sm">
          <thead class="bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th class="border-b px-5 py-3">템플릿</th>
              <th class="border-b px-5 py-3">구성</th>
              <th class="border-b px-5 py-3">섹션</th>
              <th class="border-b px-5 py-3">최종 수정</th>
              <th class="border-b px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="template in filteredTemplates"
              :key="template.id"
              class="hover:bg-zinc-50/70"
            >
              <td class="px-5 py-4">
                <p class="font-semibold">{{ template.name }}</p>
                <p class="mt-1 max-w-md truncate text-xs text-zinc-500">
                  {{ template.description || '설명 없음' }}
                </p>
              </td>
              <td class="px-5 py-4">
                <strong>{{ template.sections.length }}</strong> 섹션 ·
                <strong>{{
                  template.sections.reduce((sum, section) => sum + section.rows.length, 0)
                }}</strong>
                항목
              </td>
              <td class="px-5 py-4">
                <div class="flex max-w-sm flex-wrap gap-1">
                  <span
                    v-for="section in template.sections.slice(0, 4)"
                    :key="section.clientId"
                    class="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800"
                    >{{ section.name }}</span
                  ><span
                    v-if="template.sections.length > 4"
                    class="px-1 py-1 text-[10px] text-zinc-500"
                    >+{{ template.sections.length - 4 }}</span
                  >
                </div>
              </td>
              <td class="px-5 py-4 text-xs text-zinc-500">
                {{ formatUpdatedAt(template.updatedAt) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-1">
                  <Button as-child variant="ghost" size="sm"
                    ><NuxtLink :to="`/admin/packing-templates/${template.id}`"
                      ><Pencil /> 수정</NuxtLink
                    ></Button
                  ><Button as-child variant="ghost" size="sm"
                    ><NuxtLink
                      :to="{ path: '/admin/packing-templates/new', query: { source: template.id } }"
                      ><Copy /> 복제</NuxtLink
                    ></Button
                  ><Button
                    type="button"
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    :loading="deletingId === template.id"
                    @click="archiveTemplate(template)"
                    ><Trash2 /> 삭제</Button
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-if="errorMessage && templates.length"
        class="border-t bg-red-50 px-5 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
    </section>
  </main>
</template>
