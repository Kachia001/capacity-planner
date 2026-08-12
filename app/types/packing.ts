export type PackingRowDraft = {
  clientId: string
  sortOrder: number
  label: string
  isChecked: boolean
  memo: string
}

export type PackingSectionDraft = {
  clientId: string
  sortOrder: number
  name: string
  memo: string
  rows: PackingRowDraft[]
}

export type PackingTemplateDraft = {
  id: string
  name: string
  description: string
  revision: number
  updatedAt: string
  sections: PackingSectionDraft[]
}

export type PackingListDetail = {
  id: string
  bayId: string
  bayCode: string
  memo: string
  version: number
  totalRows: number
  checkedRows: number
  progress: number
  sections: PackingSectionDraft[]
}
