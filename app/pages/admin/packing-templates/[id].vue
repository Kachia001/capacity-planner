<script setup lang="ts">
import { ArrowLeft, Loader2, Save, TriangleAlert } from '@lucide/vue'
import PackingListEditor from '@/components/packing/PackingListEditor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clonePackingSections, fetchPackingTemplates } from '@/composables/usePackingLists'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { PackingSectionDraft } from '@/types/packing'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})

const route = useRoute()
const router = useRouter()
const templateId = computed(() => String(route.params.id))
const name = ref('')
const description = ref('')
const revision = ref(1)
const sections = ref<PackingSectionDraft[]>([])
const loading = ref(true)
const pending = ref(false)
const errorMessage = ref<string | null>(null)
const notice = ref<string | null>(null)
useHead(() => ({ title: `${name.value || '패킹 템플릿'} 수정 · Capacity Planner` }))

const invalid = computed(
  () =>
    name.value.trim().length < 2 ||
    sections.value.length === 0 ||
    sections.value.some(
      section => !section.name.trim() || section.rows.some(row => !row.label.trim()),
    ),
)

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const templates = await fetchPackingTemplates()
    const template = templates.find(candidate => candidate.id === templateId.value)
    if (!template) throw new Error('패킹 템플릿을 찾을 수 없습니다.')
    name.value = template.name
    description.value = template.description
    revision.value = template.revision
    sections.value = clonePackingSections(template.sections)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹 템플릿을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (invalid.value || pending.value) return
  pending.value = true
  errorMessage.value = null
  notice.value = null
  try {
    const response = await $fetch<{ revision: number }>(
      `/api/packing-list-templates/${templateId.value}`,
      {
        method: 'PUT',
        body: {
          name: name.value.trim(),
          description: description.value.trim(),
          revision: revision.value,
          sections: clonePackingSections(sections.value),
        },
      },
    )
    revision.value = response.revision
    notice.value = '패킹 템플릿을 저장했습니다.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '패킹 템플릿을 저장하지 못했습니다.')
  } finally {
    pending.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <main class="min-h-full bg-[#edf2ee] px-4 py-7 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[92rem]">
      <NuxtLink
        to="/admin/packing-templates"
        class="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
        ><ArrowLeft class="size-4" /> 패킹 리스트 관리</NuxtLink
      >

      <div
        v-if="loading"
        class="mt-8 flex min-h-64 items-center justify-center rounded-xl border bg-white text-sm text-zinc-500"
      >
        <Loader2 class="mr-2 size-5 animate-spin" /> 템플릿을 불러오는 중입니다.
      </div>
      <div
        v-else-if="errorMessage && sections.length === 0"
        class="mt-8 flex min-h-64 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 text-center text-red-700"
      >
        <TriangleAlert class="size-8" />
        <p class="mt-3 text-sm font-semibold">{{ errorMessage }}</p>
        <Button type="button" variant="outline" class="mt-4" @click="load">다시 시도</Button>
      </div>

      <template v-else>
        <header class="mt-7">
          <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700">
            Edit packing blueprint
          </p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em]">패킹 템플릿을 수정합니다.</h1>
          <p class="mt-2 text-sm text-zinc-600">
            수정 내용은 이후 복사되는 패킹리스트에만 사용되며 기존 Bay에는 반영되지 않습니다.
          </p>
        </header>

        <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="space-y-5">
            <section class="rounded-xl border bg-white p-5 shadow-sm">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-2 text-xs font-semibold"
                  >템플릿명<Input v-model="name"
                /></label>
                <label class="grid gap-2 text-xs font-semibold"
                  >설명<Input v-model="description"
                /></label>
              </div>
            </section>
            <PackingListEditor v-model="sections" />
          </div>

          <aside class="h-fit rounded-xl border bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <h2 class="font-semibold">수정 요약</h2>
            <dl class="mt-4 grid grid-cols-2 gap-3">
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
            <p v-if="notice" class="mt-4 text-sm font-semibold text-emerald-700">{{ notice }}</p>
            <p v-if="errorMessage" class="mt-4 text-sm font-semibold text-red-700">
              {{ errorMessage }}
            </p>
            <Button
              type="button"
              class="mt-5 w-full"
              :disabled="invalid"
              :loading="pending"
              @click="save"
              ><Save /> 변경사항 저장</Button
            >
            <Button
              type="button"
              variant="ghost"
              class="mt-2 w-full"
              @click="router.push('/admin/packing-templates')"
              >목록으로 돌아가기</Button
            >
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
