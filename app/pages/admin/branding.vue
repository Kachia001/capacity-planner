<script setup lang="ts">
import {
  Check,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type {
  SiteBrandingResponse,
  SiteLogoListItem,
  SiteLogoListResponse,
  SiteLogoUploadResponse,
} from '#shared/api/branding/branding.contract'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: '사이트 로고 관리 · Capacity Planner' })

const auth = useAuthStore()
const branding = useBrandingStore()
const globalAlert = useGlobalAlertStore()
const logos = ref<SiteLogoListItem[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const loading = ref(true)
const uploading = ref(false)
const activatingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)

function applyList(response: SiteLogoListResponse) {
  logos.value = response.logos
  branding.apply({ version: response.version, currentLogo: response.currentLogo })
}

async function requireAuthenticated() {
  await auth.initialize()
  if (!auth.user) throw new Error('로그인이 필요합니다.')
}

async function loadLogos() {
  loading.value = true
  errorMessage.value = null
  try {
    await requireAuthenticated()
    applyList(await $fetch<SiteLogoListResponse>('/api/admin/logos'))
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '로고 목록을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

function selectFile(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
  errorMessage.value = null
  noticeMessage.value = null
}

async function uploadLogo() {
  if (!selectedFile.value) return
  if (selectedFile.value.size > 10 * 1024 * 1024) {
    errorMessage.value = '로고 파일은 10MB 이하여야 합니다.'
    return
  }

  uploading.value = true
  errorMessage.value = null
  noticeMessage.value = null
  try {
    await requireAuthenticated()
    const formData = new FormData()
    formData.append('logo', selectedFile.value)
    const result = await $fetch<SiteLogoUploadResponse>('/api/admin/logos', {
      method: 'POST',
      body: formData,
    })
    noticeMessage.value = `${result.logo.originalName} 로고를 업로드하고 최적화했습니다.`
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    await loadLogos()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '로고를 업로드하지 못했습니다.')
  } finally {
    uploading.value = false
  }
}

async function activateLogo(logo: SiteLogoListItem) {
  if (logo.isActive) return
  activatingId.value = logo.id
  errorMessage.value = null
  noticeMessage.value = null
  try {
    const nextBranding = await $fetch<SiteBrandingResponse>(
      `/api/admin/logos/${logo.id}/activate`,
      { method: 'PUT' },
    )
    branding.apply(nextBranding)
    noticeMessage.value = `${logo.originalName} 로고를 모든 사용자의 현재 로고로 설정했습니다.`
    await loadLogos()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '현재 로고를 변경하지 못했습니다.')
  } finally {
    activatingId.value = null
  }
}

async function deleteLogo(logo: SiteLogoListItem) {
  if (logo.isActive) return
  const accepted = await globalAlert.confirm({
    variant: 'destructive',
    title: '업로드된 로고를 삭제할까요?',
    message: `${logo.originalName} 파일이 서버에서 삭제됩니다.`,
    confirmLabel: '로고 삭제',
    cancelLabel: '취소',
  })
  if (!accepted) return

  deletingId.value = logo.id
  errorMessage.value = null
  noticeMessage.value = null
  try {
    await $fetch(`/api/admin/logos/${logo.id}`, { method: 'DELETE' })
    noticeMessage.value = `${logo.originalName} 로고를 삭제했습니다.`
    await loadLogos()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '로고를 삭제하지 못했습니다.')
  } finally {
    deletingId.value = null
  }
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

onMounted(() => {
  void loadLogos()
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:py-10">
    <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#718068]">
          Site branding
        </p>
        <h2 class="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171a17] sm:text-[2rem]">
          사이트 로고를 관리합니다.
        </h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
          선택한 로고는 사용자가 페이지를 새로고침하거나 다시 접속할 때 공통으로 적용됩니다.
        </p>
      </div>
      <Button type="button" variant="outline" size="md" :disabled="loading" @click="loadLogos">
        <RefreshCw :class="['size-4', loading ? 'animate-spin' : '']" /> 새로고침
      </Button>
    </header>

    <p
      v-if="noticeMessage"
      role="status"
      class="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
    >
      <Check class="size-4" /> {{ noticeMessage }}
    </p>
    <p
      v-if="errorMessage"
      role="alert"
      class="mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
    >
      <TriangleAlert class="size-4" /> {{ errorMessage }}
    </p>

    <section class="mt-6 rounded-xl border border-[#d9ddd5] bg-white p-4 shadow-sm sm:p-5">
      <div class="flex items-start gap-3">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf2e4] text-[#526348]"
        >
          <Upload class="size-5" />
        </span>
        <div>
          <h3 class="font-semibold text-[#1d241c]">새 로고 업로드</h3>
          <p class="mt-1 text-xs leading-5 text-[#7b8378]">
            PNG, JPEG, WebP · 최대 10MB. 큰 이미지는 비율을 유지해 최대 1200×400으로 축소하고 WebP로
            저장합니다.
          </p>
        </div>
      </div>
      <form
        class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        @submit.prevent="uploadLogo"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="min-w-0 flex-1 rounded-lg border border-[#d6dad2] bg-[#fafbf8] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eaf2e4] file:px-3 file:py-2 file:font-semibold file:text-[#405237]"
          @change="selectFile"
        />
        <Button type="submit" size="lg" :disabled="!selectedFile || uploading">
          <Loader2 v-if="uploading" class="size-4 animate-spin" />
          <Upload v-else class="size-4" /> {{ uploading ? '최적화 중' : '업로드' }}
        </Button>
      </form>
    </section>

    <section class="mt-6">
      <div
        v-if="loading"
        class="flex min-h-64 items-center justify-center rounded-xl border border-[#d9ddd5] bg-white text-sm text-[#777f76]"
      >
        <Loader2 class="mr-2 size-5 animate-spin" /> 로고 목록을 불러오는 중입니다.
      </div>
      <div
        v-else-if="logos.length === 0"
        class="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#cdd2c9] bg-white px-6 text-center"
      >
        <ImageIcon class="size-9 text-[#8a9387]" />
        <p class="mt-3 text-sm font-semibold text-[#3e463c]">업로드된 로고가 없습니다.</p>
        <p class="mt-1 text-xs text-[#858c83]">현재는 기본 Capacity Planner 아이콘이 표시됩니다.</p>
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="logo in logos"
          :key="logo.id"
          class="overflow-hidden rounded-xl border bg-white shadow-sm"
          :class="logo.isActive ? 'border-[#91ac76] ring-2 ring-[#c5f277]/40' : 'border-[#d9ddd5]'"
        >
          <div
            class="flex h-36 items-center justify-center border-b border-[#e4e7e1] bg-[linear-gradient(45deg,#f3f4f1_25%,transparent_25%),linear-gradient(-45deg,#f3f4f1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f1_75%),linear-gradient(-45deg,transparent_75%,#f3f4f1_75%)] bg-[length:20px_20px] p-5"
          >
            <img
              :src="logo.url"
              :alt="`${logo.originalName} 미리보기`"
              class="max-h-full max-w-full object-contain"
            />
          </div>
          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold text-[#252b24]">
                  {{ logo.originalName }}
                </h3>
                <p class="mt-1 text-xs text-[#7b8378]">
                  {{ logo.width }}×{{ logo.height }} · {{ formatBytes(logo.sizeBytes) }}
                </p>
                <p class="mt-1 text-[11px] text-[#92998f]">{{ formatDate(logo.createdAt) }}</p>
              </div>
              <span
                v-if="logo.isActive"
                class="shrink-0 rounded-full bg-[#eaf5dc] px-2.5 py-1 text-[10px] font-bold text-[#49613b]"
                >사용 중</span
              >
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="md"
                :variant="logo.isActive ? 'outline' : 'default'"
                :disabled="logo.isActive || activatingId !== null || deletingId !== null"
                @click="activateLogo(logo)"
              >
                <Loader2 v-if="activatingId === logo.id" class="size-4 animate-spin" />
                <Check v-else class="size-4" />
                {{ logo.isActive ? '현재 로고' : '현재 로고로 설정' }}
              </Button>
              <Button
                type="button"
                variant="outline"
                tone="danger"
                size="md"
                :disabled="logo.isActive || deletingId !== null || activatingId !== null"
                @click="deleteLogo(logo)"
              >
                <Loader2 v-if="deletingId === logo.id" class="size-4 animate-spin" />
                <Trash2 v-else class="size-4" /> 삭제
              </Button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
