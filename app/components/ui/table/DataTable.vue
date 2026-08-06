<script setup lang="ts" generic="T extends object">
import type { HTMLAttributes } from 'vue'
import type {
  DataTableCellContext,
  DataTableColumn,
  DataTableOptions,
  DataTableRowKey,
} from './data-table'
import { Loader2 } from '@lucide/vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import Table from './Table.vue'
import TableBody from './TableBody.vue'
import TableCaption from './TableCaption.vue'
import TableCell from './TableCell.vue'
import TableEmpty from './TableEmpty.vue'
import TableHead from './TableHead.vue'
import TableHeader from './TableHeader.vue'
import TableRow from './TableRow.vue'

interface Props<T> {
  data: readonly T[]
  columns: readonly DataTableColumn<T>[]
  options?: DataTableOptions<T>
  rowKey?: Extract<keyof T, string> | ((row: T, rowIndex: number) => DataTableRowKey)
  loading?: boolean
  loadingText?: string
  emptyText?: string
  caption?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props<T>>(), {
  loading: false,
  loadingText: '데이터를 불러오는 중입니다.',
  emptyText: '표시할 데이터가 없습니다.',
})

const resolvedOptions = computed(() => ({
  density: props.options?.density ?? 'default',
  hoverable: props.options?.hoverable ?? true,
  striped: props.options?.striped ?? false,
  stickyHeader: props.options?.stickyHeader ?? false,
  showHeader: props.options?.showHeader ?? true,
  emptyValue: props.options?.emptyValue ?? '-',
  tableClass: props.options?.tableClass,
  headerClass: props.options?.headerClass,
  headerRowClass: props.options?.headerRowClass,
  bodyClass: props.options?.bodyClass,
  rowClass: props.options?.rowClass,
  rowAttrs: props.options?.rowAttrs,
  rowState: props.options?.rowState,
}))

const visibleColumns = computed(() => props.columns.filter(column => !column.hidden))

const densityHeadClass = computed(() => {
  if (resolvedOptions.value.density === 'compact') return 'h-8 px-3 py-2 text-xs'
  if (resolvedOptions.value.density === 'comfortable') return 'h-12 px-5 py-4'
  return 'h-10 px-4 py-3'
})

const densityCellClass = computed(() => {
  if (resolvedOptions.value.density === 'compact') return 'px-3 py-2'
  if (resolvedOptions.value.density === 'comfortable') return 'px-5 py-4'
  return 'px-4 py-3'
})

function getRowKey(row: T, rowIndex: number): DataTableRowKey {
  if (typeof props.rowKey === 'function') return props.rowKey(row, rowIndex)

  if (props.rowKey) {
    const value = row[props.rowKey]
    if (typeof value === 'string' || typeof value === 'number') return value
  }

  return rowIndex
}

function getCellValue(column: DataTableColumn<T>, row: T, rowIndex: number) {
  if (typeof column.accessor === 'function') return column.accessor(row, rowIndex)
  return row[column.accessor ?? (column.key as Extract<keyof T, string>)]
}

function getDisplayValue(column: DataTableColumn<T>, row: T, rowIndex: number) {
  const value = getCellValue(column, row, rowIndex)

  if (column.format) return column.format(value, row, rowIndex)
  if (value === null || value === undefined || value === '') return resolvedOptions.value.emptyValue
  if (typeof value === 'boolean') return value ? 'Y' : 'N'

  return value
}

function getCellContext(
  column: DataTableColumn<T>,
  row: T,
  rowIndex: number,
): DataTableCellContext<T> {
  return {
    column,
    row,
    rowIndex,
    value: getCellValue(column, row, rowIndex),
    displayValue: getDisplayValue(column, row, rowIndex),
  }
}

function getRowCells(row: T, rowIndex: number) {
  return visibleColumns.value.map(column => getCellContext(column, row, rowIndex))
}

function getAlignClass(column: DataTableColumn<T>) {
  if (column.align === 'center') return 'text-center'
  if (column.align === 'right') return 'text-right'
  return 'text-left'
}

function getColumnStyle(column: DataTableColumn<T>) {
  return {
    width: column.width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
  }
}

function getCellClass(column: DataTableColumn<T>, row: T, rowIndex: number) {
  const columnClass =
    typeof column.cellClass === 'function' ? column.cellClass(row, rowIndex) : column.cellClass

  return cn(densityCellClass.value, getAlignClass(column), columnClass)
}

function getCellAttrs(column: DataTableColumn<T>, row: T, rowIndex: number) {
  if (typeof column.cellAttrs === 'function') return column.cellAttrs(row, rowIndex)
  return column.cellAttrs
}

function isCellVisible(column: DataTableColumn<T>, row: T, rowIndex: number) {
  return column.cellVisible?.(row, rowIndex) ?? true
}

function getRowClass(row: T, rowIndex: number) {
  const optionClass =
    typeof resolvedOptions.value.rowClass === 'function'
      ? resolvedOptions.value.rowClass(row, rowIndex)
      : resolvedOptions.value.rowClass

  return cn(
    !resolvedOptions.value.hoverable && 'hover:bg-transparent',
    resolvedOptions.value.striped && 'odd:bg-muted/25',
    optionClass,
  )
}

function getRowAttrs(row: T, rowIndex: number) {
  if (typeof resolvedOptions.value.rowAttrs === 'function') {
    return resolvedOptions.value.rowAttrs(row, rowIndex)
  }

  return resolvedOptions.value.rowAttrs
}
</script>

<template>
  <div data-slot="data-table" :class="cn('w-full', props.class)">
    <Table :class="resolvedOptions.tableClass">
      <TableCaption v-if="caption || $slots.caption">
        <slot name="caption" :caption="caption">
          {{ caption }}
        </slot>
      </TableCaption>

      <slot v-if="resolvedOptions.showHeader" name="header" :columns="visibleColumns">
        <TableHeader
          :class="
            cn(
              'bg-muted/40',
              resolvedOptions.stickyHeader && 'sticky top-0 z-10 bg-background',
              resolvedOptions.headerClass,
            )
          "
        >
          <TableRow :class="resolvedOptions.headerRowClass">
            <TableHead
              v-for="(column, columnIndex) in visibleColumns"
              :key="column.key"
              v-bind="column.headerAttrs"
              scope="col"
              :style="getColumnStyle(column)"
              :class="cn(densityHeadClass, getAlignClass(column), column.headerClass)"
            >
              <slot :name="`header-${column.key}`" :column="column" :column-index="columnIndex">
                <slot name="header-cell" :column="column" :column-index="columnIndex">
                  {{ column.header }}
                </slot>
              </slot>
            </TableHead>
          </TableRow>
        </TableHeader>
      </slot>

      <slot name="body" :rows="data" :columns="visibleColumns" :loading="loading">
        <TableBody :class="resolvedOptions.bodyClass">
          <TableEmpty v-if="loading" :colspan="Math.max(visibleColumns.length, 1)">
            <slot name="loading" :columns="visibleColumns">
              <span class="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 class="size-4 animate-spin" aria-hidden="true" />
                {{ loadingText }}
              </span>
            </slot>
          </TableEmpty>

          <TableEmpty v-else-if="data.length === 0" :colspan="Math.max(visibleColumns.length, 1)">
            <slot name="empty" :columns="visibleColumns">
              <span class="text-muted-foreground">{{ emptyText }}</span>
            </slot>
          </TableEmpty>

          <template v-else>
            <slot name="before-rows" :rows="data" :columns="visibleColumns" />

            <template v-for="(row, rowIndex) in data" :key="getRowKey(row, rowIndex)">
              <slot
                name="row"
                :row="row"
                :row-index="rowIndex"
                :columns="visibleColumns"
                :cells="getRowCells(row, rowIndex)"
              >
                <TableRow
                  v-bind="getRowAttrs(row, rowIndex)"
                  :data-state="resolvedOptions.rowState?.(row, rowIndex)"
                  :class="getRowClass(row, rowIndex)"
                >
                  <template v-for="column in visibleColumns" :key="column.key">
                    <TableCell
                      v-if="isCellVisible(column, row, rowIndex)"
                      v-bind="getCellAttrs(column, row, rowIndex)"
                      :style="getColumnStyle(column)"
                      :class="getCellClass(column, row, rowIndex)"
                    >
                      <slot
                        :name="`cell-${column.key}`"
                        v-bind="getCellContext(column, row, rowIndex)"
                      >
                        <slot name="cell" v-bind="getCellContext(column, row, rowIndex)">
                          {{ getDisplayValue(column, row, rowIndex) }}
                        </slot>
                      </slot>
                    </TableCell>
                  </template>
                </TableRow>
              </slot>
            </template>

            <slot name="after-rows" :rows="data" :columns="visibleColumns" />
          </template>
        </TableBody>
      </slot>

      <slot name="footer" :rows="data" :columns="visibleColumns" />
    </Table>
  </div>
</template>
