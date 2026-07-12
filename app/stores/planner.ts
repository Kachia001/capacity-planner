import { defineStore } from 'pinia'

type DashboardSummary = {
  total?: number
  completed?: number
  issues?: number
}

type BaySummary = {
  bay: string
  total: number
  completed: number
  issues: number
  completionRate: number
}

type WorkItem = {
  id: number
  bay: string
  sourceRow: number | null
  workNo: number | null
  workName: string | null
  workDetail: string | null
  vendor: string | null
  partNo: string | null
  itemName: string | null
  bolt: string | null
  hasIssue: boolean
  isCompleted: boolean
  worker: string | null
  workDate: string | null
  issueNote: string | null
}

type WorkItemsResponse = {
  summary: DashboardSummary
  baySummaries: BaySummary[]
  selectedBay: string | null
  selectedBayItems: WorkItem[]
  latest: WorkItem[]
}

export const usePlannerStore = defineStore('planner', () => {
  const summary = ref<DashboardSummary>({})
  const baySummaries = ref<BaySummary[]>([])
  const selectedBay = ref<string | null>(null)
  const selectedBayItems = ref<WorkItem[]>([])
  const latest = ref<WorkItem[]>([])
  const pending = ref(false)
  const detailPending = ref(false)
  const errorMessage = ref<string | null>(null)

  async function fetchWorkItems(bay?: string) {
    const auth = useAuthStore()
    const accessToken = await auth.getAccessToken()

    if (!accessToken) {
      throw new Error('로그인이 필요합니다.')
    }

    return await $fetch<WorkItemsResponse>('/api/work-items', {
      query: bay ? { bay } : undefined,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  }

  async function loadSelectedBayItems(bay: string) {
    detailPending.value = true
    errorMessage.value = null
    selectedBay.value = bay

    try {
      const data = await fetchWorkItems(bay)

      if (selectedBay.value === bay) {
        selectedBayItems.value = data.selectedBayItems
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load selected bay.'
      selectedBayItems.value = []
    } finally {
      if (selectedBay.value === bay) {
        detailPending.value = false
      }
    }
  }

  async function loadWorkItems() {
    pending.value = true
    errorMessage.value = null

    try {
      const data = await fetchWorkItems()
      summary.value = data.summary
      baySummaries.value = data.baySummaries
      latest.value = data.latest

      const currentBay = selectedBay.value

      if (currentBay && data.baySummaries.some(item => item.bay === currentBay)) {
        await loadSelectedBayItems(currentBay)
      } else {
        selectedBay.value = null
        selectedBayItems.value = []
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load work items.'
    } finally {
      pending.value = false
    }
  }

  async function selectBay(bay: string) {
    await loadSelectedBayItems(bay)
  }

  function clearSelectedBay() {
    selectedBay.value = null
    selectedBayItems.value = []
    detailPending.value = false
  }

  return {
    summary,
    baySummaries,
    selectedBay,
    selectedBayItems,
    latest,
    pending,
    detailPending,
    errorMessage,
    loadWorkItems,
    selectBay,
    clearSelectedBay,
  }
})
