<script setup lang="ts">
import { CalendarClock, RefreshCw, Save, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'

definePageMeta({
  layout: 'app',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
})
useHead({ title: '출퇴근 관리 · Capacity Planner' })

type User = { id: string; email: string; displayName: string | null; role: string; isActive: boolean }
type Attendance = {
  id?: number
  sessionId?: number
  userId: string
  displayName: string | null
  email: string
  startedAt: string
  endedAt: string | null
  isWorking?: boolean
  sessions?: Array<{ id: number; startedAt: string; endedAt: string | null }>
}

const businessTimeZone = useRuntimeConfig().public.businessTimeZone
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: businessTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
const selectedMonth = ref(today.slice(0, 7))
const selectedUserId = ref('')
const users = ref<User[]>([])
const todayRows = ref<Attendance[]>([])
const history = ref<Attendance[]>([])
const activeUserIds = ref<string[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const editingSession = ref<Attendance | null>(null)
const correctionPending = ref(false)
const correctionError = ref<string | null>(null)
const correctionForm = reactive({
  startedDate: '',
  startedTime: '',
  endedDate: '',
  endedTime: '',
  invalidateClockOut: false,
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: businessTimeZone,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
})

function dateTimeParts(value: Date) {
  return Object.fromEntries(
    dateTimeFormatter.formatToParts(value).map(part => [part.type, part.value]),
  )
}

function toBusinessDateTime(value: string) {
  const parts = dateTimeParts(new Date(value))
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

function businessDateTimeToIso(date: string, time: string) {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number)
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const desired = Date.UTC(year, month - 1, day, hour, minute)
  let guess = desired

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = dateTimeParts(new Date(guess))
    const observed = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    )
    guess += desired - observed
  }

  return new Date(guess).toISOString()
}

function zonedMidnight(date: string) {
  return businessDateTimeToIso(date, '00:00')
}

function businessRange(startDate: string, endDate: string) {
  return {
    start: zonedMidnight(startDate),
    end: zonedMidnight(endDate),
  }
}

function nextDay(date: string) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

function monthRange(month: string) {
  const [year = 0, value = 0] = month.split('-').map(Number)
  const end = value === 12 ? `${year + 1}-01-01` : `${year}-${String(value + 1).padStart(2, '0')}-01`
  return businessRange(`${month}-01`, end)
}

function formatKst(value: string | null) {
  if (!value) return '근무 중'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: businessTimeZone, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

const calendarDays = computed(() => {
  const [year = 0, month = 0] = selectedMonth.value.split('-').map(Number)
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: count }, (_, index) => `${selectedMonth.value}-${String(index + 1).padStart(2, '0')}`),
  ]
})

function sessionsForDay(date: string) {
  const start = new Date(zonedMidnight(date)).getTime()
  const end = new Date(zonedMidnight(nextDay(date))).getTime()
  return history.value.filter(row => {
    const rowStart = new Date(row.startedAt).getTime()
    const rowEnd = row.endedAt ? new Date(row.endedAt).getTime() : Number.POSITIVE_INFINITY
    return rowStart < end && rowEnd > start
  })
}

function errorText(error: unknown, fallback: string) {
  const data = error && typeof error === 'object' && 'data' in error ? error.data : null
  return data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
    ? data.message : fallback
}

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const day = businessRange(today, nextDay(today))
    const month = { ...monthRange(selectedMonth.value), ...(selectedUserId.value ? { userId: selectedUserId.value } : {}) }
    const [nextUsers, nextToday, nextHistory, nextActive] = await Promise.all([
      $fetch<User[]>('/api/users'),
      $fetch<Attendance[]>('/api/attendance/manager/status', { query: day }),
      $fetch<Attendance[]>('/api/attendance/manager/history', { query: month }),
      $fetch<{ userIds: string[] }>('/api/attendance/manager/active'),
    ])
    users.value = nextUsers.filter(user => user.isActive)
    todayRows.value = nextToday
    history.value = nextHistory
    activeUserIds.value = nextActive.userIds
  } catch (error) {
    errorMessage.value = errorText(error, '출퇴근 정보를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function processUser(user: User, action: 'clock-in' | 'clock-out') {
  const label = action === 'clock-in' ? '출근' : '퇴근'
  if (!window.confirm(`${user.displayName || user.email} 사용자를 ${label} 처리하시겠습니까?`)) return
  try {
    await $fetch(`/api/attendance/manager/${action}`, { method: 'POST', body: { userId: user.id } })
    await load()
  } catch (error) {
    errorMessage.value = errorText(error, `${label} 처리하지 못했습니다.`)
  }
}

function editSession(row: Attendance) {
  if (!row.id) return
  const started = toBusinessDateTime(row.startedAt)
  const ended = row.endedAt ? toBusinessDateTime(row.endedAt) : null
  correctionForm.startedDate = started.date
  correctionForm.startedTime = started.time
  correctionForm.endedDate = ended?.date ?? started.date
  correctionForm.endedTime = ended?.time ?? started.time
  correctionForm.invalidateClockOut = !row.endedAt
  correctionError.value = null
  editingSession.value = row
}

function closeCorrectionDialog() {
  if (correctionPending.value) return
  editingSession.value = null
  correctionError.value = null
}

async function saveCorrection() {
  const row = editingSession.value
  if (!row?.id) return

  if (!correctionForm.startedDate || !correctionForm.startedTime) {
    correctionError.value = '출근 날짜와 시각을 모두 입력해 주세요.'
    return
  }
  if (
    !correctionForm.invalidateClockOut &&
    (!correctionForm.endedDate || !correctionForm.endedTime)
  ) {
    correctionError.value = '퇴근 날짜와 시각을 모두 입력해 주세요.'
    return
  }

  const startedAt = businessDateTimeToIso(
    correctionForm.startedDate,
    correctionForm.startedTime,
  )
  const endedAt = correctionForm.invalidateClockOut
    ? null
    : businessDateTimeToIso(correctionForm.endedDate, correctionForm.endedTime)

  if (endedAt && new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
    correctionError.value = '퇴근 시각은 출근 시각보다 빠를 수 없습니다.'
    return
  }

  correctionPending.value = true
  correctionError.value = null
  try {
    await $fetch(`/api/attendance/manager/sessions/${row.id}`, {
      method: 'PATCH', body: { startedAt, endedAt },
    })
    editingSession.value = null
    await load()
  } catch (error) {
    correctionError.value = errorText(error, '기록을 수정하지 못했습니다.')
  } finally {
    correctionPending.value = false
  }
}

async function deleteSession(row: Attendance) {
  if (!row.id || !window.confirm('이 출근 기록을 무효 처리(삭제)하시겠습니까?')) return
  try {
    await $fetch(`/api/attendance/manager/sessions/${row.id}`, { method: 'DELETE' })
    await load()
  } catch (error) {
    errorMessage.value = errorText(error, '출근 기록을 무효 처리하지 못했습니다.')
  }
}

watch([selectedMonth, selectedUserId], load)
onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{{ businessTimeZone }} · UTC storage</p>
        <h2 class="mt-2 flex items-center gap-2 text-2xl font-semibold"><CalendarClock class="size-6" /> 출퇴근 관리</h2>
      </div>
      <Button variant="outline" :disabled="loading" @click="load"><RefreshCw class="size-4" :class="loading && 'animate-spin'" /> 새로고침</Button>
    </header>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>

    <section class="rounded-xl border border-[#d9ddd5] bg-white p-5">
      <h3 class="text-lg font-semibold">오늘 출근 현황</h3>
      <p class="mt-1 text-xs text-zinc-500">KST {{ today }} 00:00부터 다음 날 00:00 전에 출근한 사용자</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="user in users" :key="user.id" class="rounded-lg border border-zinc-200 p-4">
          <div class="flex items-start justify-between gap-2">
            <div><p class="font-semibold">{{ user.displayName || user.email }}</p><p class="text-xs text-zinc-500">{{ user.email }}</p></div>
            <span class="rounded px-2 py-1 text-[10px]" :class="activeUserIds.includes(user.id) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'">
              {{ activeUserIds.includes(user.id) ? '근무 중' : todayRows.some(row => row.userId === user.id) ? '퇴근' : '오늘 미출근' }}
            </span>
          </div>
          <div class="mt-4 flex gap-2">
            <Button size="sm" :disabled="activeUserIds.includes(user.id)" @click="processUser(user, 'clock-in')">출근 처리</Button>
            <Button size="sm" variant="outline" :disabled="!activeUserIds.includes(user.id)" @click="processUser(user, 'clock-out')">퇴근 처리</Button>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-xl border border-[#d9ddd5] bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><h3 class="text-lg font-semibold">월간 출퇴근 히스토리</h3><p class="mt-1 text-xs text-zinc-500">선택한 KST 월과 근무 시간이 겹치는 세션</p></div>
        <div class="flex gap-2">
          <select v-model="selectedUserId" class="max-w-52 rounded-md border border-zinc-300 px-3 py-2 text-sm">
            <option value="">전체 사용자</option>
            <option v-for="user in users" :key="user.id" :value="user.id">{{ user.displayName || user.email }}</option>
          </select>
          <input v-model="selectedMonth" type="month" class="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="mt-5 hidden grid-cols-7 overflow-hidden rounded-lg border border-zinc-200 md:grid">
        <div v-for="label in ['일', '월', '화', '수', '목', '금', '토']" :key="label" class="border-b bg-zinc-50 p-2 text-center text-xs font-semibold text-zinc-500">{{ label }}</div>
        <div v-for="(date, index) in calendarDays" :key="date || `empty-${index}`" class="min-h-28 border-b border-r border-zinc-100 p-2" :class="!date && 'bg-zinc-50/60'">
          <template v-if="date">
            <p class="text-xs font-semibold text-zinc-600">{{ Number(date.slice(-2)) }}</p>
            <button
              v-for="row in sessionsForDay(date).slice(0, 3)"
              :key="row.id"
              type="button"
              class="mt-1 block w-full truncate rounded bg-emerald-50 px-1.5 py-1 text-left text-[10px] text-emerald-900 hover:bg-emerald-100"
              :title="`${row.displayName || row.email}: ${formatKst(row.startedAt)} ~ ${formatKst(row.endedAt)}`"
              @click="editSession(row)"
            >
              {{ row.displayName || row.email }} · {{ row.endedAt ? '완료' : '근무 중' }}
            </button>
            <p v-if="sessionsForDay(date).length > 3" class="mt-1 text-[10px] text-zinc-500">+{{ sessionsForDay(date).length - 3 }}건</p>
          </template>
        </div>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[700px] text-left text-sm">
          <thead class="border-b text-xs text-zinc-500"><tr><th class="p-3">사용자</th><th class="p-3">출근(KST)</th><th class="p-3">퇴근(KST)</th><th class="p-3">정정</th></tr></thead>
          <tbody>
            <tr v-for="row in history" :key="row.id" class="border-b border-zinc-100">
              <td class="p-3"><strong>{{ row.displayName || row.email }}</strong><br><span class="text-xs text-zinc-500">{{ row.email }}</span></td>
              <td class="p-3">{{ formatKst(row.startedAt) }}</td><td class="p-3">{{ formatKst(row.endedAt) }}</td>
              <td class="p-3"><div class="flex gap-2"><Button size="sm" variant="outline" @click="editSession(row)">시간/퇴근 수정</Button><Button size="sm" variant="outline" @click="deleteSession(row)">출근 무효</Button></div></td>
            </tr>
            <tr v-if="!history.length"><td colspan="4" class="p-8 text-center text-zinc-500">조회된 출퇴근 기록이 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="editingSession"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        role="presentation"
        @click.self="closeCorrectionDialog"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-correction-title"
          class="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        >
          <header class="flex items-start justify-between gap-4 border-b border-zinc-200 p-5">
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {{ businessTimeZone }} 기준
              </p>
              <h3 id="attendance-correction-title" class="mt-1 text-xl font-semibold">
                출퇴근 시간 정정
              </h3>
              <p class="mt-1 text-sm text-zinc-500">
                {{ editingSession.displayName || editingSession.email }}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-md"
              :disabled="correctionPending"
              aria-label="정정 창 닫기"
              @click="closeCorrectionDialog"
            >
              <X class="size-4" />
            </Button>
          </header>

          <form class="space-y-5 p-5" @submit.prevent="saveCorrection">
            <fieldset class="space-y-3">
              <legend class="text-sm font-semibold">출근 시각</legend>
              <div class="grid grid-cols-[minmax(0,1fr)_9rem] gap-3">
                <label class="space-y-1.5 text-xs font-medium text-zinc-600">
                  날짜
                  <input
                    v-model="correctionForm.startedDate"
                    type="date"
                    required
                    class="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label class="space-y-1.5 text-xs font-medium text-zinc-600">
                  시각
                  <input
                    v-model="correctionForm.startedTime"
                    type="time"
                    step="60"
                    required
                    class="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset class="space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <legend class="text-sm font-semibold">퇴근 시각</legend>
                <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
                  <input
                    v-model="correctionForm.invalidateClockOut"
                    type="checkbox"
                    class="size-4 rounded border-zinc-300 accent-emerald-600"
                  />
                  퇴근 무효 처리(다시 근무 중)
                </label>
              </div>
              <div
                class="grid grid-cols-[minmax(0,1fr)_9rem] gap-3"
                :class="correctionForm.invalidateClockOut && 'opacity-45'"
              >
                <label class="space-y-1.5 text-xs font-medium text-zinc-600">
                  날짜
                  <input
                    v-model="correctionForm.endedDate"
                    type="date"
                    :required="!correctionForm.invalidateClockOut"
                    :disabled="correctionForm.invalidateClockOut"
                    class="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100"
                  />
                </label>
                <label class="space-y-1.5 text-xs font-medium text-zinc-600">
                  시각
                  <input
                    v-model="correctionForm.endedTime"
                    type="time"
                    step="60"
                    :required="!correctionForm.invalidateClockOut"
                    :disabled="correctionForm.invalidateClockOut"
                    class="block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100"
                  />
                </label>
              </div>
            </fieldset>

            <p class="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              화면에는 {{ businessTimeZone }} 기준으로 입력하며, 저장할 때 UTC 시각으로 자동 변환합니다.
              다른 근무 세션과 겹치거나 퇴근이 출근보다 빠르면 저장되지 않습니다.
            </p>
            <p
              v-if="correctionError"
              role="alert"
              class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {{ correctionError }}
            </p>

            <footer class="flex justify-end gap-2 border-t border-zinc-100 pt-4">
              <Button
                type="button"
                variant="outline"
                :disabled="correctionPending"
                @click="closeCorrectionDialog"
              >
                취소
              </Button>
              <Button type="submit" :disabled="correctionPending">
                <RefreshCw v-if="correctionPending" class="size-4 animate-spin" />
                <Save v-else class="size-4" />
                {{ correctionPending ? '저장 중' : '정정 저장' }}
              </Button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
  </div>
</template>
