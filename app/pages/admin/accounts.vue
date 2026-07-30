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
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/table'
import type { DataTableColumn, DataTableOptions } from '@/components/ui/table'
import { getRequestErrorMessage } from '@/composables/useOperationsApi'
import type { AppRole } from '@/stores/auth'

definePageMeta({
  layout: 'admin',
  middleware: ['auth-client', 'role-client'],
  roles: ['admin', 'manager'],
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
    createForm.password.length >= 8 &&
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

const accountTableColumns: DataTableColumn<AccountRow>[] = [
  {
    key: 'login',
    header: '로그인 ID',
    accessor: account => getLoginId(account.email),
    width: '25%',
    headerClass: 'px-5 py-3.5 text-[11px] font-semibold text-[#697067]',
    cellClass: 'px-5 py-4',
  },
  {
    key: 'displayName',
    header: '이름',
    accessor: 'displayName',
    format: value => value || '이름 미등록',
    width: '23%',
    headerClass: 'px-4 py-3.5 text-[11px] font-semibold text-[#697067]',
    cellClass: 'px-4 py-4 text-sm font-medium text-[#353b34]',
  },
  {
    key: 'role',
    header: '직책',
    accessor: 'role',
    width: '18%',
    headerClass: 'px-4 py-3.5 text-[11px] font-semibold text-[#697067]',
    cellClass: 'px-4 py-4',
  },
  {
    key: 'createdAt',
    header: '등록일',
    accessor: 'createdAt',
    format: value => formatCreatedAt(String(value)),
    width: '18%',
    headerClass: 'px-4 py-3.5 text-[11px] font-semibold text-[#697067]',
    cellClass: 'px-4 py-4 font-mono text-[11px] text-[#6f766d]',
  },
  {
    key: 'status',
    header: '상태',
    accessor: () => 'active',
    align: 'right',
    width: '16%',
    headerClass: 'px-5 py-3.5 text-[11px] font-semibold text-[#697067]',
    cellClass: 'px-5 py-4',
  },
]

const accountTableOptions: DataTableOptions<AccountRow> = {
  tableClass: 'min-w-[48rem] border-collapse text-left',
  headerClass: 'bg-[#f7f8f5]',
  headerRowClass: 'border-b border-[#e0e4dd]',
  bodyClass: 'divide-y divide-[#eceee9]',
  rowClass: 'transition hover:bg-[#fbfcf9]',
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
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    accounts.value = await $fetch<AccountRow[]>('/api/users')
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
    if (!auth.user) throw new Error('로그인이 필요합니다.')
    const created = await $fetch<AccountRow>('/api/users', {
      method: 'POST',
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
  <div class="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-10">
    <section class="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div
        class="flex flex-col items-stretch gap-6 xl:flex-row xl:items-end xl:justify-between xl:gap-8"
      >
        <div>
          <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#718068]">
            Identity & access control
          </p>
          <h2 class="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#171a17] sm:text-[2rem]">
            접속 계정과 직책을 관리합니다.
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#727970]">
            시스템에 등록된 사용자의 로그인 ID와 표시 이름, 역할을 확인하고 신규 계정을 생성합니다.
          </p>
        </div>

        <dl
          class="grid w-full overflow-hidden rounded-xl border border-[#d9ddd5] bg-white shadow-[0_12px_36px_rgba(24,35,26,0.05)] xl:w-auto xl:min-w-[28rem]"
          :class="auth.isAdmin ? 'grid-cols-3' : 'grid-cols-2'"
        >
          <div v-if="auth.isAdmin" class="border-r border-[#e4e7e1] px-5 py-4">
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
        class="mt-6 rounded-xl border border-[#d9ddd5] bg-[#fafbf8] p-4 shadow-[0_10px_30px_rgba(24,35,26,0.035)] sm:mt-8 sm:p-5"
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
          class="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(22rem,1fr)_14rem_auto]"
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
              <option v-if="auth.isAdmin" value="admin">시스템 관리자</option>
              <option value="manager">운영 관리자</option>
              <option value="worker">작업자</option>
            </select>
          </label>
          <div class="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-1">
            <Button
              type="button"
              variant="outline"
              tone="neutral"
              size="lg"
              class="border-[#d6dad2] bg-white text-xs text-[#60675f] hover:border-[#aeb5ab] hover:text-[#171a17]"
              @click="resetFilters"
            >
              <RotateCcw class="size-3.5" /> 초기화
            </Button>
            <Button type="submit" variant="solid" tone="neutral" size="lg" class="text-xs">
              <Search class="size-3.5" /> 조회
            </Button>
          </div>
        </div>
      </form>

      <div class="my-5 flex items-center justify-between">
        <Button
          type="button"
          variant="solid"
          tone="success"
          size="md"
          class="text-xs font-bold shadow-[0_8px_18px_rgba(100,130,61,0.13)]"
          @click="showCreatePanel = true"
        >
          <UserPlus class="size-4" /> 계정 생성
        </Button>
        <Button
          type="button"
          variant="ghost"
          tone="neutral"
          size="sm"
          :loading="refreshing"
          loading-text="동기화 중"
          class="text-xs text-[#697067] hover:bg-white hover:text-[#171a17]"
          @click="loadAccounts(true)"
        >
          <RefreshCw class="size-3.5" /> 최신 정보
        </Button>
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
          <Button
            type="button"
            variant="ghost"
            tone="neutral"
            size="icon"
            aria-label="계정 생성 닫기"
            class="text-[#838b81] hover:bg-[#f1f3ef] hover:text-[#222721]"
            @click="closeCreatePanel"
          >
            <X class="size-4" />
          </Button>
        </div>

        <form
          class="mt-5 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_1fr_auto]"
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
              <option v-if="auth.isAdmin" value="manager">운영 관리자</option>
              <!--              <option value="admin">시스템 관리자</option>-->
            </select>
          </label>
          <label class="grid gap-2 text-xs font-semibold text-[#50574f]">
            임시 비밀번호
            <input
              v-model="createForm.password"
              type="password"
              autocomplete="new-password"
              class="h-11 rounded-lg border border-[#d6dad2] px-3 text-sm outline-none focus:border-[#71865e] focus:ring-4 focus:ring-[#c5f277]/20"
              placeholder="8자 이상"
            />
          </label>
          <Button
            type="submit"
            :disabled="!canCreate"
            :loading="createPending"
            loading-text="생성 중"
            variant="solid"
            tone="neutral"
            size="lg"
            class="text-xs sm:col-span-2 xl:col-span-1"
          >
            <UserPlus class="size-3.5" /> 생성
          </Button>
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
          <Button
            type="button"
            variant="outline"
            tone="danger"
            size="sm"
            class="mt-4 border-red-200 text-xs text-red-700 hover:bg-red-50"
            @click="loadAccounts()"
          >
            <RefreshCw class="size-3.5" /> 다시 시도
          </Button>
        </div>
        <div
          v-else-if="filteredAccounts.length === 0"
          class="flex min-h-72 flex-col items-center justify-center text-center"
        >
          <Search class="size-7 text-[#879084]" />
          <p class="mt-3 text-sm font-semibold">조건에 맞는 계정이 없습니다.</p>
        </div>
        <template v-else>
          <section data-layout="mobile" class="divide-y divide-[#eceee9] md:hidden">
            <article v-for="account in filteredAccounts" :key="account.id" class="p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="break-all font-mono text-sm font-bold text-[#20251f]">
                    {{ getLoginId(account.email) }}
                  </p>
                  <p class="mt-1 break-all text-[10px] leading-4 text-[#969d94]">
                    {{ account.email }}
                  </p>
                </div>
                <span
                  class="inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                  :class="getRoleClass(account.role)"
                >
                  {{ getRoleLabel(account.role) }}
                </span>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#e0e4dd]">
                <div class="bg-white px-3 py-3">
                  <dt class="text-[9px] text-[#8b9289]">이름</dt>
                  <dd class="mt-1 text-sm font-semibold text-[#353b34]">
                    {{ account.displayName || '이름 미등록' }}
                  </dd>
                </div>
                <div class="bg-white px-3 py-3">
                  <dt class="text-[9px] text-[#8b9289]">등록일</dt>
                  <dd class="mt-1 font-mono text-[11px] text-[#6f766d]">
                    {{ formatCreatedAt(account.createdAt) }}
                  </dd>
                </div>
              </dl>
              <p
                class="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"
              >
                <span class="size-1.5 rounded-full bg-emerald-500" /> 활성
              </p>
            </article>
          </section>

          <section data-layout="desktop" class="hidden md:block">
            <DataTable
              :data="filteredAccounts"
              :columns="accountTableColumns"
              :options="accountTableOptions"
              row-key="id"
            >
              <template #cell-login="{ row }">
                <p class="font-mono text-xs font-bold text-[#20251f]">
                  {{ getLoginId(row.email) }}
                </p>
                <p class="mt-1 text-[10px] text-[#969d94]">{{ row.email }}</p>
              </template>

              <template #cell-role="{ row }">
                <span
                  class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                  :class="getRoleClass(row.role)"
                >
                  {{ getRoleLabel(row.role) }}
                </span>
              </template>

              <template #cell-status>
                <span
                  class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"
                >
                  <span class="size-1.5 rounded-full bg-emerald-500" /> 활성
                </span>
              </template>
            </DataTable>
          </section>
        </template>
      </section>
    </section>
  </div>
</template>
