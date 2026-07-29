<script setup lang="ts">
import {
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  MessageCircleMore,
  RefreshCw,
  RotateCw,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type {
  TelegramDeliveriesResponse,
  TelegramDeliveryListItem,
  TelegramDeliveryStatus,
  TelegramSettingsResponse,
} from '@/types/telegram'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: 'Telegram 알림 설정 · Capacity Planner' })

const auth = useAuthStore()
const globalAlert = useGlobalAlertStore()
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const deleting = ref(false)
const deliveriesLoading = ref(true)
const processingDeliveries = ref(false)
const retryingDeliveryId = ref<number | null>(null)
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)
const settings = ref<TelegramSettingsResponse | null>(null)
const deliveryState = ref<TelegramDeliveriesResponse | null>(null)
const botToken = ref('')
const chatId = ref('')
const isEnabled = ref(true)
const showToken = ref(false)

const canSave = computed(
  () =>
    settings.value?.configurationStatus !== 'encryption_key_missing' &&
    chatId.value.trim().length > 0 &&
    (settings.value?.configurationStatus === 'encryption_key_mismatch'
      ? botToken.value.trim().length >= 30
      : settings.value?.configured || botToken.value.trim().length >= 30) &&
    !saving.value,
)

function applySettings(nextSettings: TelegramSettingsResponse) {
  settings.value = nextSettings
  chatId.value = nextSettings.chatId
  isEnabled.value = nextSettings.isEnabled
  botToken.value = ''
}

async function requireAuthenticated() {
  await auth.initialize()
  if (!auth.user) throw new Error('로그인이 필요합니다.')
}

async function loadSettings() {
  loading.value = true
  errorMessage.value = null

  try {
    await requireAuthenticated()
    applySettings(await $fetch<TelegramSettingsResponse>('/api/admin/telegram-settings'))
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Telegram 설정을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function loadDeliveries() {
  deliveriesLoading.value = true

  try {
    await requireAuthenticated()
    deliveryState.value = await $fetch<TelegramDeliveriesResponse>('/api/admin/telegram-deliveries')
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Telegram 전송 내역을 불러오지 못했습니다.')
  } finally {
    deliveriesLoading.value = false
  }
}

async function saveSettings() {
  if (!canSave.value) return
  saving.value = true
  errorMessage.value = null
  noticeMessage.value = null

  try {
    await requireAuthenticated()
    const token = botToken.value.trim()
    const nextSettings = await $fetch<TelegramSettingsResponse>('/api/admin/telegram-settings', {
      method: 'PUT',
      body: {
        chatId: chatId.value.trim(),
        isEnabled: isEnabled.value,
        ...(token ? { botToken: token } : {}),
      },
    })
    applySettings(nextSettings)
    noticeMessage.value = 'Telegram 알림 설정을 안전하게 저장했습니다.'
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Telegram 설정을 저장하지 못했습니다.')
  } finally {
    saving.value = false
  }
}

async function sendTestMessage() {
  testing.value = true
  errorMessage.value = null
  noticeMessage.value = null

  try {
    await requireAuthenticated()
    await $fetch('/api/admin/telegram-settings/test', {
      method: 'POST',
    })
    noticeMessage.value = 'Telegram 테스트 메시지를 전송했습니다.'
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '테스트 메시지를 전송하지 못했습니다.')
  } finally {
    testing.value = false
  }
}

async function deleteSettings() {
  const accepted = await globalAlert.confirm({
    variant: 'destructive',
    title: 'Telegram 설정을 삭제할까요?',
    message:
      '저장된 Bot Token과 대상 채팅 정보가 삭제됩니다. 이후 등록되는 이슈는 Telegram으로 전송되지 않습니다.',
    confirmLabel: '설정 삭제',
    cancelLabel: '취소',
  })

  if (!accepted) return

  deleting.value = true
  errorMessage.value = null
  noticeMessage.value = null

  try {
    await requireAuthenticated()
    await $fetch('/api/admin/telegram-settings', {
      method: 'DELETE',
    })
    applySettings({
      configured: false,
      encryptionReady: settings.value?.encryptionReady ?? false,
      configurationStatus: 'not_configured',
      chatId: '',
      isEnabled: false,
      botTokenMasked: null,
      updatedAt: null,
    })
    noticeMessage.value = 'Telegram 설정을 삭제했습니다.'
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Telegram 설정을 삭제하지 못했습니다.')
  } finally {
    deleting.value = false
  }
}

async function processPendingDeliveries() {
  processingDeliveries.value = true
  errorMessage.value = null
  noticeMessage.value = null

  try {
    await requireAuthenticated()
    const result = await $fetch<{
      claimed: number
      sent: number
      retried: number
      failed: number
      skipped: number
    }>('/api/admin/telegram-deliveries/process', {
      method: 'POST',
    })
    noticeMessage.value =
      result.claimed === 0
        ? '현재 처리할 Telegram 알림이 없습니다.'
        : `전송 ${result.sent}건, 재시도 예약 ${result.retried}건, 실패 ${result.failed}건을 처리했습니다.`
    await loadDeliveries()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '전송 대기열을 처리하지 못했습니다.')
  } finally {
    processingDeliveries.value = false
  }
}

async function retryDelivery(delivery: TelegramDeliveryListItem) {
  retryingDeliveryId.value = delivery.id
  errorMessage.value = null
  noticeMessage.value = null

  try {
    await requireAuthenticated()
    await $fetch(`/api/admin/telegram-deliveries/${delivery.id}/retry`, {
      method: 'POST',
    })
    noticeMessage.value = `전송 #${delivery.id}을 다시 처리했습니다.`
    await loadDeliveries()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Telegram 알림을 다시 보내지 못했습니다.')
  } finally {
    retryingDeliveryId.value = null
  }
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return '아직 저장되지 않음'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function deliveryStatusLabel(status: TelegramDeliveryStatus) {
  return {
    pending: '전송 대기',
    processing: '처리 중',
    sent: '전송 완료',
    failed: '최종 실패',
    skipped: '전송 제외',
  }[status]
}

function deliveryStatusClass(status: TelegramDeliveryStatus) {
  return {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    processing: 'border-sky-200 bg-sky-50 text-sky-800',
    sent: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    failed: 'border-red-200 bg-red-50 text-red-800',
    skipped: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  }[status]
}

onMounted(() => {
  void Promise.all([loadSettings(), loadDeliveries()])
})
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:py-10">
    <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#718068]">
          External issue notifications
        </p>
        <h2 class="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171a17] sm:text-[2rem]">
          Telegram 이슈 알림을 설정합니다.
        </h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
          Manager와 Worker가 작업 이슈를 등록하면 지정한 채팅으로 작업 정보와 이슈 내용이
          전송됩니다.
        </p>
      </div>
      <span
        class="inline-flex h-9 w-fit items-center gap-2 rounded-full border px-3 text-xs font-bold"
        :class="
          settings?.configured && settings.isEnabled
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-zinc-300 bg-white text-zinc-600'
        "
      >
        <span
          class="size-2 rounded-full"
          :class="settings?.configured && settings.isEnabled ? 'bg-emerald-500' : 'bg-zinc-400'"
        />
        {{ settings?.configured && settings.isEnabled ? '알림 사용 중' : '알림 미설정' }}
      </span>
    </header>

    <div
      v-if="loading"
      class="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-[#d9ddd5] bg-white text-sm text-[#777f76]"
    >
      <Loader2 class="mr-2 size-5 animate-spin text-[#6f845e]" /> Telegram 설정을 불러오는 중입니다.
    </div>

    <template v-else>
      <p
        v-if="noticeMessage"
        role="status"
        class="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
      >
        <CheckCircle2 class="size-4 shrink-0" /> {{ noticeMessage }}
      </p>
      <p
        v-if="errorMessage"
        role="alert"
        class="mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
      >
        <TriangleAlert class="size-4 shrink-0" /> {{ errorMessage }}
      </p>
      <p
        v-if="settings?.configurationStatus === 'encryption_key_missing'"
        role="alert"
        class="mt-6 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900"
      >
        <TriangleAlert class="mt-1 size-4 shrink-0" />
        서버 환경변수 NUXT_TELEGRAM_ENCRYPTION_KEY를 32자 이상으로 설정해야 Bot Token을 안전하게
        저장하고 사용할 수 있습니다.
      </p>
      <p
        v-if="settings?.configurationStatus === 'encryption_key_mismatch'"
        role="alert"
        class="mt-6 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-900"
      >
        <TriangleAlert class="mt-1 size-4 shrink-0" />
        현재 서버 키로 저장된 Bot Token을 복호화할 수 없습니다. 새 Bot Token을 입력해 설정을 다시
        저장해 주세요.
      </p>

      <section
        class="mt-6 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white shadow-[0_16px_48px_-40px_rgba(15,23,42,0.55)]"
      >
        <div class="border-b border-[#e0e4dd] bg-[#f9faf8] px-4 py-4 sm:px-5">
          <div class="flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf2e4] text-[#526348]"
            >
              <BellRing class="size-5" />
            </span>
            <div>
              <h3 class="font-semibold text-[#1d241c]">Bot API 연결 정보</h3>
              <p class="mt-1 text-xs leading-5 text-[#7b8378]">
                Bot Token은 암호화해 저장하며 저장 이후 원문을 다시 표시하지 않습니다.
              </p>
            </div>
          </div>
        </div>

        <form class="space-y-5 p-4 sm:p-5" @submit.prevent="saveSettings">
          <label class="grid gap-2 text-sm font-semibold text-[#3f473e]">
            Telegram Bot Token
            <span class="relative">
              <KeyRound
                class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8b9289]"
              />
              <input
                v-model="botToken"
                :type="showToken ? 'text' : 'password'"
                autocomplete="off"
                class="h-12 w-full rounded-lg border border-[#d6dad2] bg-white pl-10 pr-12 font-mono text-sm outline-none transition focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
                :placeholder="
                  settings?.configured
                    ? `${settings.botTokenMasked} · 변경할 때만 새 토큰 입력`
                    : 'BotFather에서 발급받은 Bot Token'
                "
              />
              <Button
                type="button"
                variant="ghost"
                tone="neutral"
                size="icon-md"
                class="absolute right-1 top-1 text-[#7b8378] hover:bg-[#f1f3ef]"
                :aria-label="showToken ? 'Bot Token 숨기기' : 'Bot Token 보기'"
                @click="showToken = !showToken"
              >
                <EyeOff v-if="showToken" class="size-4" />
                <Eye v-else class="size-4" />
              </Button>
            </span>
            <span class="text-xs font-normal leading-5 text-[#858c83]">
              기존 토큰을 유지하려면 비워 두세요. 토큰은 서버에서만 복호화됩니다.
            </span>
          </label>

          <label class="grid gap-2 text-sm font-semibold text-[#3f473e]">
            대상 Chat ID 또는 채널 사용자명
            <span class="relative">
              <MessageCircleMore
                class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8b9289]"
              />
              <input
                v-model="chatId"
                class="h-12 w-full rounded-lg border border-[#d6dad2] bg-white pl-10 pr-4 font-mono text-sm outline-none transition focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
                placeholder="-1001234567890 또는 @channelusername"
              />
            </span>
            <span class="text-xs font-normal leading-5 text-[#858c83]">
              그룹·채널에서는 Bot이 메시지를 보낼 수 있는 권한을 가지고 있어야 합니다.
            </span>
          </label>

          <label
            class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d9ddd5] bg-[#fafbf8] p-4"
          >
            <input v-model="isEnabled" type="checkbox" class="mt-0.5 size-5 accent-emerald-700" />
            <span>
              <strong class="block text-sm text-[#252b24]">작업 이슈 Telegram 알림 사용</strong>
              <span class="mt-1 block text-xs leading-5 text-[#7b8378]">
                비활성화해도 이슈는 시스템에 정상 저장되며 외부 전송만 중지됩니다.
              </span>
            </span>
          </label>

          <div
            class="flex flex-col gap-3 border-t border-[#e5e8e2] pt-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-xs text-[#858c83]">
              최근 저장: {{ formatUpdatedAt(settings?.updatedAt) }}
            </p>
            <div class="grid grid-cols-2 gap-2 sm:flex">
              <Button
                v-if="settings?.configured"
                type="button"
                variant="outline"
                size="lg"
                :disabled="testing || saving || !settings.isEnabled || !settings.encryptionReady"
                @click="sendTestMessage"
              >
                <Loader2 v-if="testing" class="size-4 animate-spin" />
                <Send v-else class="size-4" /> 테스트 전송
              </Button>
              <Button type="submit" size="lg" :disabled="!canSave">
                <Loader2 v-if="saving" class="size-4 animate-spin" />
                <ShieldCheck v-else class="size-4" />
                {{ saving ? '저장 중' : '설정 저장' }}
              </Button>
            </div>
          </div>
        </form>
      </section>

      <section
        class="mt-6 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white shadow-[0_16px_48px_-40px_rgba(15,23,42,0.55)]"
      >
        <div
          class="flex flex-col gap-3 border-b border-[#e0e4dd] bg-[#f9faf8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf2e4] text-[#526348]"
            >
              <History class="size-5" />
            </span>
            <div>
              <h3 class="font-semibold text-[#1d241c]">알림 전송 상태</h3>
              <p class="mt-1 text-xs leading-5 text-[#7b8378]">
                실패한 알림은 자동 재시도되며 최종 실패 건은 직접 다시 보낼 수 있습니다.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="md"
              :disabled="deliveriesLoading"
              @click="loadDeliveries"
            >
              <RefreshCw :class="['size-4', deliveriesLoading ? 'animate-spin' : '']" />
              새로고침
            </Button>
            <Button
              type="button"
              size="md"
              :disabled="
                processingDeliveries ||
                !deliveryState ||
                deliveryState.summary.pending + deliveryState.summary.processing === 0
              "
              @click="processPendingDeliveries"
            >
              <Loader2 v-if="processingDeliveries" class="size-4 animate-spin" />
              <Send v-else class="size-4" /> 지금 처리
            </Button>
          </div>
        </div>

        <div
          v-if="deliveriesLoading && !deliveryState"
          class="p-8 text-center text-sm text-[#777f76]"
        >
          <Loader2 class="mr-2 inline size-4 animate-spin" /> 전송 내역을 불러오는 중입니다.
        </div>

        <template v-else-if="deliveryState">
          <dl class="grid grid-cols-2 gap-px bg-[#e4e8e1] sm:grid-cols-5">
            <div class="bg-white px-4 py-3">
              <dt class="text-[10px] text-[#858c83]">전송 대기</dt>
              <dd class="mt-1 font-mono text-lg font-bold text-amber-700">
                {{ deliveryState.summary.pending }}
              </dd>
            </div>
            <div class="bg-white px-4 py-3">
              <dt class="text-[10px] text-[#858c83]">처리 중</dt>
              <dd class="mt-1 font-mono text-lg font-bold text-sky-700">
                {{ deliveryState.summary.processing }}
              </dd>
            </div>
            <div class="bg-white px-4 py-3">
              <dt class="text-[10px] text-[#858c83]">전송 완료</dt>
              <dd class="mt-1 font-mono text-lg font-bold text-emerald-700">
                {{ deliveryState.summary.sent }}
              </dd>
            </div>
            <div class="bg-white px-4 py-3">
              <dt class="text-[10px] text-[#858c83]">최종 실패</dt>
              <dd class="mt-1 font-mono text-lg font-bold text-red-700">
                {{ deliveryState.summary.failed }}
              </dd>
            </div>
            <div class="col-span-2 bg-white px-4 py-3 sm:col-span-1">
              <dt class="text-[10px] text-[#858c83]">전송 제외</dt>
              <dd class="mt-1 font-mono text-lg font-bold text-zinc-600">
                {{ deliveryState.summary.skipped }}
              </dd>
            </div>
          </dl>

          <div
            v-if="deliveryState.deliveries.length === 0"
            class="px-5 py-10 text-center text-sm text-[#858c83]"
          >
            아직 Telegram 알림 전송 기록이 없습니다.
          </div>

          <div v-else class="divide-y divide-[#e8ebe5]">
            <article
              v-for="delivery in deliveryState.deliveries"
              :key="delivery.id"
              class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="font-mono text-xs text-[#283027]">
                    전송 #{{ delivery.id }} · 작업 #{{ delivery.workItemId }}
                  </strong>
                  <span
                    class="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    :class="deliveryStatusClass(delivery.status)"
                  >
                    {{ deliveryStatusLabel(delivery.status) }}
                  </span>
                </div>
                <p class="mt-1 text-[11px] text-[#7b8378]">
                  생성 {{ formatUpdatedAt(delivery.createdAt) }} · 시도
                  {{ delivery.attemptCount }}회
                  <template v-if="delivery.sentAt">
                    · 완료 {{ formatUpdatedAt(delivery.sentAt) }}
                  </template>
                </p>
                <p
                  v-if="delivery.lastErrorMessage"
                  class="mt-1 break-words text-xs leading-5 text-red-700"
                >
                  {{ delivery.lastErrorCode }} · {{ delivery.lastErrorMessage }}
                </p>
              </div>

              <Button
                v-if="delivery.status === 'failed' || delivery.status === 'skipped'"
                type="button"
                variant="outline"
                size="md"
                class="shrink-0"
                :disabled="retryingDeliveryId !== null"
                @click="retryDelivery(delivery)"
              >
                <Loader2 v-if="retryingDeliveryId === delivery.id" class="size-4 animate-spin" />
                <RotateCw v-else class="size-4" /> 다시 전송
              </Button>
            </article>
          </div>
        </template>
      </section>

      <section
        v-if="settings?.configured"
        class="mt-6 flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div>
          <h3 class="text-sm font-semibold text-red-900">연동 정보 삭제</h3>
          <p class="mt-1 text-xs leading-5 text-red-700">
            저장된 Bot Token과 Chat ID를 제거하고 외부 알림 전송을 중단합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          class="shrink-0"
          :disabled="deleting"
          @click="deleteSettings"
        >
          <Loader2 v-if="deleting" class="size-4 animate-spin" />
          <Trash2 v-else class="size-4" /> 설정 삭제
        </Button>
      </section>
    </template>
  </main>
</template>
