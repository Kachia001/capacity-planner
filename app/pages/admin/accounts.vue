<script setup lang="ts">
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  UsersRound,
  X,
} from '@lucide/vue'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { AppRole } from '@/stores/auth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin'],
})
useHead({ title: '계정관리 · Capacity Planner Admin' })

type AccountRoleFilter = AppRole | 'all'

interface AccountRow {
  id: string
  email: string
  displayName: string | null
  role: AppRole
  createdAt: string
}

interface AccountFilters {
  query: string
  role: AccountRoleFilter
}

const auth = useAuthStore()
const accounts = ref<AccountRow[]>([])
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref<string | null>(null)
const createError = ref<string | null>(null)
const createNotice = ref<string | null>(null)
const createPending = ref(false)
const showCreatePanel = ref(false)
const formFilters = reactive<AccountFilters>({ query: '', role: 'all' })
const activeFilters = ref<AccountFilters>({ query: '', role: 'all' })
const createForm = reactive({
  loginId: '',
  displayName: '',
  role: 'worker' as AppRole,
  password: '',
})

const filteredAccounts = computed(() => {
  const query = activeFilters.value.query.trim().toLocaleLowerCase()

  return accounts.value.filter(account => {
    const loginId = account.email.split('@')[0] ?? account.email
    const matchesQuery =
      !query ||
      loginId.toLocaleLowerCase().includes(query) ||
      account.email.toLocaleLowerCase().includes(query) ||
      account.displayName?.toLocaleLowerCase().includes(query)
    const matchesRole =
      activeFilters.value.role === 'all' || activeFilters.value.role === account.role
    return Boolean(matchesQuery && matchesRole)
  })
})

const roleCounts = computed(() =>
  accounts.value.reduce(
    (counts, account) => {
      counts[account.role] += 1
      return counts
    },
    { admin: 0, manager: 0, worker: 0 },
  ),
)

const canCreate = computed(
  () =>
    createForm.loginId.trim().length >= 2 &&
    createForm.displayName.trim().length >= 1 &&
    createForm.password.length >= 6 &&
    !createPending.value,
)

function getLoginId(email: string) {
  return email.split('@')[0] || email
}

function getRoleLabel(role: AppRole) {
  return { admin: '시스템 관리자', manager: '운영 관리자', worker: '작업자' }[role]
}

function getRoleClass(role: AppRole) {
  return {
    admin: 'border-zinc-300 bg-zinc-900 text-white',
    manager: 'border-sky-200 bg-sky-50 text-sky-800',
    worker: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[role]
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

function applyFilters() {
  activeFilters.value = { ...formFilters }
}

function resetFilters() {
  formFilters.query = ''
  formFilters.role = 'all'
  applyFilters()
}

function resetCreateForm() {
  createForm.loginId = ''
  createForm.displayName = ''
  createForm.role = 'worker'
  createForm.password = ''
  createError.value = null
}

function closeCreatePanel() {
  showCreatePanel.value = false
  resetCreateForm()
}

function normalizeAccountEmail(loginId: string) {
  const normalized = loginId.trim().toLocaleLowerCase()
  return normalized.includes('@') ? normalized : `${normalized}@capacity-planner.local`
}

async function loadAccounts(isRefresh = false) {
  if (isRefresh) refreshing.value = true
  else loading.value = true
  errorMessage.value = null

  try {
    await auth.initialize()
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    accounts.value = await $fetch<AccountRow[]>('/api/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '계정 목록을 불러오지 못했습니다.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function createAccount() {
  if (!canCreate.value) return
  createPending.value = true
  createError.value = null
  createNotice.value = null

  try {
    const accessToken = await auth.getAccessToken()
    if (!accessToken) throw new Error('로그인이 필요합니다.')
    const created = await $fetch<AccountRow>('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        email: normalizeAccountEmail(createForm.loginId),
        password: createForm.password,
        displayName: createForm.displayName.trim(),
        role: createForm.role,
      },
    })
    accounts.value = [...accounts.value, created].sort((first, second) =>
      first.email.localeCompare(second.email),
    )
    createNotice.value = `${getLoginId(created.email)} 계정을 생성했습니다.`
    closeCreatePanel()
  } catch (error) {
    createError.value = getRequestErrorMessage(error, '계정을 생성하지 못했습니다.')
  } finally {
    createPending.value = false
  }
}

onMounted(() => {
  void loadAccounts()
})
</script>

<template>
  <div class="mx-auto w-full max-w-[100rem] px-8 py-8 xl:px-10 xl:py-10">
    <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div
        class="flex flex-col items-stretch gap-6 xl:flex-row xl:items-end xl:justify-between xl:gap-8"
      >
        <div>
          <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
            Identity & access control
          </p>
          <h2 class="mt-2 text-[2rem] font-semibold tracking-[-0.045em] text-[#171a17]">
            접속 계정과 직책을 관리합니다.
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
            시스템에 등록된 사용자의 로그인 ID와 표시 이름, 역할을 확인하고 신규 계정을 생성합니다.
          </p>
        </div>

        <dl
          class="grid w-full grid-cols-3 overflow-hidden rounded-xl border border-[#d9ddd5] bg-white shadow-[0_12px_36px_rgba(24,35,26,0.05)] xl:w-auto xl:min-w-[28rem]"
        >
          <div class="border-r border-[#e4e7e1] px-5 py-4">
            <dt class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#969d94]">Admin</dt>
            <dd class="mt-1.5 text-2xl font-semibold tracking-[-0.04em]">{{ roleCounts.admin }}</dd>
          </div>
          <div class="border-r border-[#e4e7e1] px-5 py-4">
            <dt class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#969d94]">Manager</dt>
            <dd class="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-sky-700">
              {{ roleCounts.manager }}
            </dd>
          </div>
          <div class="px-5 py-4">
            <dt class="font-mono text-[8px] uppercase tracking-[0.16em] text-[#969d94]">Worker</dt>
            <dd class="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-emerald-700">
              {{ roleCounts.worker }}
            </dd>
          </div>
        </dl>
      </div>

      <form
        class="mt-8 rounded-xl border border-[#d9ddd5] bg-[#fafbf8] p-5 shadow-[0_10px_30px_rgba(24,35,26,0.035)]"
        @submit.prevent="applyFilters"
      >
        <div class="flex items-center justify-between border-b border-[#e2e5df] pb-4">
          <div>
            <h3 class="text-sm font-semibold">조회 조건</h3>
            <p class="mt-1 text-xs text-[#858c83]">
              로그인 ID, 이름 또는 직책으로 계정을 검색합니다.
            </p>
          </div>
          <span class="font-mono text-[9px] uppercase tracking-[0.17em] text-[#9aa198]"
            >Account search</span
          >
        </div>

        <div
          class="mt-4 grid grid-cols-2 items-end gap-4 xl:grid-cols-[minmax(22rem,1fr)_14rem_auto]"
        >
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            ID / 이름
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#92998f]"
              />
              <input
                v-model="formFilters.query"
                type="search"
                class="h-11 w-full rounded-lg border border-[#d6dad2] bg-white pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-[#acb2aa] focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
                placeholder="예: admin 또는 홍길동"
              />
            </span>
          </label>
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            직책
            <select
              v-model="formFilters.role"
              class="h-11 rounded-lg border border-[#d6dad2] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
            >
              <option value="all">전체</option>
              <option value="admin">시스템 관리자</option>
              <option value="manager">운영 관리자</option>
              <option value="worker">작업자</option>
            </select>
          </label>
          <div class="col-span-2 flex items-center justify-end gap-2 xl:col-span-1">
            <button
              type="button"
              class="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d6dad2] bg-white px-4 text-xs font-semibold text-[#60675f] transition hover:border-[#aeb5ab] hover:text-[#171a17]"
              @click="resetFilters"
            >
              <RotateCcw class="size-3.5" /> 초기화
            </button>
            <button
              type="submit"
              class="inline-flex h-11 items-center gap-2 rounded-lg bg-[#171b18] px-5 text-xs font-semibold text-white transition hover:bg-[#2d352e]"
            >
              <Search class="size-3.5" /> 조회
            </button>
          </div>
        </div>
      </form>

      <div class="my-5 flex items-center justify-between">
        <button
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#bdea70] px-4 text-xs font-bold text-[#172014] shadow-[0_8px_18px_rgba(100,130,61,0.13)] transition hover:bg-[#c8f480]"
          @click="showCreatePanel = true"
        >
          <UserPlus class="size-4" /> 계정 생성
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[#697067] transition hover:bg-white hover:text-[#171a17] disabled:opacity-50"
          :disabled="refreshing"
          @click="loadAccounts(true)"
        >
          <RefreshCw class="size-3.5" :class="refreshing ? 'animate-spin' : ''" /> 최신 정보
        </button>
      </div>

      <p
        v-if="createNotice"
        class="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        role="status"
      >
        <ShieldCheck class="size-4" /> {{ createNotice }}
      </p>

      <section
        v-if="showCreatePanel"
        class="mb-5 rounded-xl border border-[#bec9b6] bg-white p-5 shadow-[0_14px_40px_rgba(24,35,26,0.07)]"
      >
        <div class="flex items-start justify-between border-b border-[#e1e5de] pb-4">
          <div>
            <p class="font-mono text-[9px] uppercase tracking-[0.18em] text-[#74806d]">
              New account
            </p>
            <h3 class="mt-1 text-base font-semibold">신규 접속 계정</h3>
          </div>
          <button
            type="button"
            aria-label="계정 생성 닫기"
            class="flex size-8 items-center justify-center rounded-md text-[#838b81] transition hover:bg-[#f1f3ef] hover:text-[#222721]"
            @click="closeCreatePanel"
          >
            <X class="size-4" />
          </button>
        </div>

        <form
          class="mt-5 grid grid-cols-2 items-end gap-4 xl:grid-cols-[1fr_1fr_0.8fr_1fr_auto]"
          @submit.prevent="createAccount"
        >
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            로그인 ID
            <input
              v-model="createForm.loginId"
              autocomplete="off"
              class="h-11 rounded-lg border border-[#d6dad2] px-3 text-sm outline-none focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
              placeholder="예: worker01"
            />
          </label>
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            이름
            <input
              v-model="createForm.displayName"
              autocomplete="off"
              class="h-11 rounded-lg border border-[#d6dad2] px-3 text-sm outline-none focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
              placeholder="표시 이름"
            />
          </label>
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            직책
            <select
              v-model="createForm.role"
              class="h-11 rounded-lg border border-[#d6dad2] bg-white px-3 text-sm outline-none focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
            >
              <option value="worker">작업자</option>
              <option value="manager">운영 관리자</option>
              <option value="admin">시스템 관리자</option>
            </select>
          </label>
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            임시 비밀번호
            <input
              v-model="createForm.password"
              type="password"
              autocomplete="new-password"
              class="h-11 rounded-lg border border-[#d6dad2] px-3 text-sm outline-none focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
              placeholder="6자 이상"
            />
          </label>
          <button
            type="submit"
            :disabled="!canCreate"
            class="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#171b18] px-5 text-xs font-semibold text-white transition hover:bg-[#2d352e] disabled:cursor-not-allowed disabled:opacity-40 xl:col-span-1"
          >
            <Loader2 v-if="createPending" class="size-3.5 animate-spin" />
            <UserPlus v-else class="size-3.5" /> 생성
          </button>
        </form>
        <p
          v-if="createError"
          class="mt-3 flex items-center gap-2 text-xs font-semibold text-red-700"
          role="alert"
        >
          <TriangleAlert class="size-3.5" /> {{ createError }}
        </p>
      </section>

      <section
        class="overflow-hidden rounded-xl border border-[#d6dad2] bg-white shadow-[0_14px_40px_rgba(24,35,26,0.055)]"
      >
        <div class="flex h-14 items-center justify-between border-b border-[#e0e4dd] px-5">
          <div class="flex items-center gap-3">
            <span
              class="flex size-8 items-center justify-center rounded-md bg-[#eef3e9] text-[#526348]"
            >
              <UsersRound class="size-4" />
            </span>
            <div>
              <h3 class="text-sm font-semibold">계정 목록</h3>
              <p class="mt-0.5 text-[11px] text-[#8b9289]">등록 계정 {{ accounts.length }}명</p>
            </div>
          </div>
          <p class="text-xs text-[#777f76]">
            조회 결과 <strong class="font-mono text-[#20251f]">{{ filteredAccounts.length }}</strong
            >건
          </p>
        </div>

        <div
          v-if="loading"
          class="flex min-h-72 items-center justify-center text-sm text-[#777f76]"
        >
          <Loader2 class="mr-2 size-5 animate-spin text-[#6f845e]" /> 계정 정보를 불러오는 중입니다.
        </div>
        <div
          v-else-if="errorMessage"
          class="flex min-h-72 flex-col items-center justify-center text-center"
        >
          <TriangleAlert class="size-8 text-red-600" />
          <p class="mt-3 text-sm font-semibold text-red-800">{{ errorMessage }}</p>
          <button
            type="button"
            class="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
            @click="loadAccounts()"
          >
            <RefreshCw class="size-3.5" /> 다시 시도
          </button>
        </div>
        <div
          v-else-if="filteredAccounts.length === 0"
          class="flex min-h-72 flex-col items-center justify-center text-center"
        >
          <Search class="size-7 text-[#879084]" />
          <p class="mt-3 text-sm font-semibold">조건에 맞는 계정이 없습니다.</p>
        </div>
        <table v-else class="w-full border-collapse text-left">
          <thead class="bg-[#f7f8f5]">
            <tr class="border-b border-[#e0e4dd]">
              <th class="w-[25%] px-5 py-3.5 text-[11px] font-semibold text-[#697067]">
                로그인 ID
              </th>
              <th class="w-[23%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">이름</th>
              <th class="w-[18%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">직책</th>
              <th class="w-[18%] px-4 py-3.5 text-[11px] font-semibold text-[#697067]">등록일</th>
              <th class="w-[16%] px-5 py-3.5 text-right text-[11px] font-semibold text-[#697067]">
                상태
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eceee9]">
            <tr
              v-for="account in filteredAccounts"
              :key="account.id"
              class="transition hover:bg-[#fbfcf9]"
            >
              <td class="px-5 py-4">
                <p class="font-mono text-xs font-bold text-[#20251f]">
                  {{ getLoginId(account.email) }}
                </p>
                <p class="mt-1 text-[10px] text-[#969d94]">{{ account.email }}</p>
              </td>
              <td class="px-4 py-4 text-sm font-medium text-[#353b34]">
                {{ account.displayName || '이름 미등록' }}
              </td>
              <td class="px-4 py-4">
                <span
                  class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                  :class="getRoleClass(account.role)"
                >
                  {{ getRoleLabel(account.role) }}
                </span>
              </td>
              <td class="px-4 py-4 font-mono text-[11px] text-[#6f766d]">
                {{ formatCreatedAt(account.createdAt) }}
              </td>
              <td class="px-5 py-4 text-right">
                <span
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"
                >
                  <span class="size-1.5 rounded-full bg-emerald-500" /> 활성
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  </div>
</template>
