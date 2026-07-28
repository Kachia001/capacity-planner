import type { HTMLAttributes } from 'vue'

export type DataTableAlign = 'left' | 'center' | 'right'
export type DataTableDensity = 'compact' | 'default' | 'comfortable'
export type DataTableRowKey = string | number
export type DataTableClass = HTMLAttributes['class']
export type DataTableAttributes = Record<string, unknown>

export interface DataTableColumn<T> {
  key: string
  header: string
  accessor?: Extract<keyof T, string> | ((row: T, rowIndex: number) => unknown)
  format?: (value: unknown, row: T, rowIndex: number) => unknown
  align?: DataTableAlign
  width?: string
  minWidth?: string
  maxWidth?: string
  hidden?: boolean
  headerClass?: DataTableClass
  cellClass?: DataTableClass | ((row: T, rowIndex: number) => DataTableClass)
  headerAttrs?: DataTableAttributes
  cellAttrs?: DataTableAttributes | ((row: T, rowIndex: number) => DataTableAttributes)
  cellVisible?: (row: T, rowIndex: number) => boolean
}

export interface DataTableOptions<T> {
  density?: DataTableDensity
  hoverable?: boolean
  striped?: boolean
  stickyHeader?: boolean
  showHeader?: boolean
  emptyValue?: string
  tableClass?: DataTableClass
  headerClass?: DataTableClass
  headerRowClass?: DataTableClass
  bodyClass?: DataTableClass
  rowClass?: DataTableClass | ((row: T, rowIndex: number) => DataTableClass)
  rowState?: (row: T, rowIndex: number) => string | undefined
}

export interface DataTableCellContext<T> {
  column: DataTableColumn<T>
  row: T
  rowIndex: number
  value: unknown
  displayValue: unknown
}

export interface DataTableHeaderContext<T> {
  column: DataTableColumn<T>
  columnIndex: number
}

export interface DataTableRowContext<T> {
  row: T
  rowIndex: number
  columns: DataTableColumn<T>[]
  cells: DataTableCellContext<T>[]
}
