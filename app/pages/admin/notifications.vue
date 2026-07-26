<script setup lang="ts">
import {
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageCircleMore,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { TelegramSettingsResponse } from '@/types/telegram'
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
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)
const settings = ref<TelegramSettingsResponse | null>(null)
const botToken = ref('')
const chatId = ref('')
const isEnabled = ref(true)
const showToken = ref(false)

const canSave = computed(
  () =>
    settings.value?.encryptionReady === true &&
    chatId.value.trim().length > 0 &&
    (settings.value?.configured || botToken.value.trim().length >= 30) &&
    !saving.value,
)

function authorizationHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

function applySettings(nextSettings: TelegramSettingsResponse) {
  settings.value = nextSettings
  chatId.value = nextSettings.chatId
  isEnabled.value = nextSettings.isEnabled
  botToken.value = ''
}

async function requireAccessToken() {
  const accessToken = await auth.getAccessToken()
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  return accessToken
}

async function loadSettings() {
  loading.value = true
  errorMessage.value = null

  try {
    const accessToken = await requireAccessToken()
    applySettings(
      await $fetch<TelegramSettingsResponse>('/api/admin/telegram-settings', {
        headers: authorizationHeaders(accessToken),
      }),
    )
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Telegram 설정을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!canSave.value) return
  saving.value = true
  errorMessage.value = null
  noticeMessage.value = null

  try {
    const accessToken = await requireAccessToken()
    const token = botToken.value.trim()
    const nextSettings = await $fetch<TelegramSettingsResponse>('/api/admin/telegram-settings', {
      method: 'PUT',
      headers: authorizationHeaders(accessToken),
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
    const accessToken = await requireAccessToken()
    await $fetch('/api/admin/telegram-settings/test', {
      method: 'POST',
      headers: authorizationHeaders(accessToken),
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
    const accessToken = await requireAccessToken()
    await $fetch('/api/admin/telegram-settings', {
      method: 'DELETE',
      headers: authorizationHeaders(accessToken),
    })
    applySettings({
      configured: false,
      encryptionReady: settings.value?.encryptionReady ?? false,
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

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return '아직 저장되지 않음'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

onMounted(loadSettings)
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
        v-if="settings && !settings.encryptionReady"
        role="alert"
        class="mt-6 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900"
      >
        <TriangleAlert class="mt-1 size-4 shrink-0" />
        서버 환경변수 NUXT_TELEGRAM_ENCRYPTION_KEY를 32자 이상으로 설정해야 Bot Token을 안전하게
        저장하고 사용할 수 있습니다.
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
              <button
                type="button"
                class="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-[#7b8378] hover:bg-[#f1f3ef]"
                :aria-label="showToken ? 'Bot Token 숨기기' : 'Bot Token 보기'"
                @click="showToken = !showToken"
              >
                <EyeOff v-if="showToken" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
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
                class="h-11 gap-2"
                :disabled="testing || saving || !settings.isEnabled || !settings.encryptionReady"
                @click="sendTestMessage"
              >
                <Loader2 v-if="testing" class="size-4 animate-spin" />
                <Send v-else class="size-4" /> 테스트 전송
              </Button>
              <Button type="submit" class="h-11 gap-2" :disabled="!canSave">
                <Loader2 v-if="saving" class="size-4 animate-spin" />
                <ShieldCheck v-else class="size-4" />
                {{ saving ? '저장 중' : '설정 저장' }}
              </Button>
            </div>
          </div>
        </form>
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
          class="h-11 shrink-0 gap-2"
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
