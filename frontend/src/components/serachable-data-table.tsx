import { useSelector } from '@tanstack/react-form'
import {
    keepPreviousData,
    type UseQueryOptions,
    useQuery,
} from '@tanstack/react-query'
import type { ColumnDef, RowData, RowSelectionState } from '@tanstack/react-table'
import { useDebounce } from '@uidotdev/usehooks'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { useAppForm } from '@/components/form/form-context'
import { SearchField } from '@/components/search-table'
import { DataTable } from '@/components/ui/data-table'
import type { DataTableFeatures } from '@/components/ui/table-features'
import type { PaginatedResponse } from '@/lib/types'

export interface PaginationState {
    pageIndex: number
    pageSize: number
}

type BaseFilters = { q: string }

export interface SearchableDataTableProps<
    TData extends RowData & { id: string | number },
    TFilters extends Record<string, unknown> = BaseFilters,
> {
    columns: ColumnDef<DataTableFeatures, TData>[]

    queryOptions: (
        params: TFilters & { page: number; limit: number }
    ) => UseQueryOptions<
        PaginatedResponse<TData>,
        any,
        PaginatedResponse<TData>,
        any
    >

    // فیلترهای اضافه به‌جز q (اختیاری)
    extraFilters?: Omit<TFilters, 'q'>

    placeholderMeta?: string
    debounceMs?: number
    initialPageSize?: number

    // همگام‌سازی سرچ
    searchValue?: string
    onSearchChange?: (value: string) => void

    // همگام‌سازی صفحه‌بندی
    pagination?: PaginationState
    onPaginationChange?: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void

    // انتخاب سطرها
    rowSelection?: RowSelectionState
    onRowSelectionChange?: (state: RowSelectionState) => void

    startAddone?: ReactElement
    endAddone?: ReactElement
}

export function SearchableDataTable<
    TData extends RowData & { id: string | number },
    TFilters extends Record<string, unknown> = BaseFilters,
>({
    columns,
    queryOptions,
    extraFilters,
    placeholderMeta,
    debounceMs = 300,
    initialPageSize = 19,
    searchValue: controlledSearchValue,
    onSearchChange,
    pagination: controlledPagination,
    onPaginationChange: controlledOnPaginationChange,
    rowSelection: controlledRowSelection,
    onRowSelectionChange: controlledOnRowSelectionChange,
    endAddone,
    startAddone,
}: SearchableDataTableProps<TData, TFilters>) {
    // --- منطق سرچ ---
    const form = useAppForm({ defaultValues: { q: controlledSearchValue ?? '' } })

    // هماهنگ‌سازی مقدار اینپوت در صورت تغییر خارجی searchValue (مثلاً بازگشت در مرورگر)
    useEffect(() => {
        if (controlledSearchValue !== undefined) {
            const currentVal = form.getFieldValue('q')
            if (currentVal !== controlledSearchValue) {
                form.setFieldValue('q', controlledSearchValue)
            }
        }
    }, [controlledSearchValue, form])

    const _q = useSelector(form.store, (state) => state.values.q)
    const debouncedQ = useDebounce(_q, debounceMs)

    // اطلاع‌رسانی به والد هنگام تغییر مقدار دبونس شده
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        if (onSearchChange && debouncedQ !== (controlledSearchValue ?? '')) {
            onSearchChange(debouncedQ)
        }
    }, [debouncedQ, onSearchChange, controlledSearchValue])

    const activeQ = controlledSearchValue !== undefined ? controlledSearchValue : debouncedQ
    const filters = { q: activeQ, ...extraFilters } as unknown as TFilters

    // --- منطق rowSelection ---
    const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
    const rowSelection = controlledRowSelection ?? internalRowSelection
    const onRowSelectionChange = controlledOnRowSelectionChange ?? setInternalRowSelection

    // --- منطق pagination ---
    const [internalPagination, setInternalPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize,
    })
    const pagination = controlledPagination ?? internalPagination
    const setPagination = controlledOnPaginationChange ?? setInternalPagination

    const filtersKey = JSON.stringify(filters)
    const prevFiltersKey = useRef(filtersKey)

    useEffect(() => {
        if (prevFiltersKey.current !== filtersKey) {
            prevFiltersKey.current = filtersKey
            if (!controlledPagination) {
                setInternalPagination((p) => ({ ...p, pageIndex: 0 }))
            }
        }
    }, [filtersKey, controlledPagination])

    const query = useQuery({
        ...queryOptions({
            ...filters,
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
        }),
        placeholderData: keepPreviousData,
    })

    const meta = query.data?.meta

    const tableMeta = {
        totalItems: meta?.totalItems ?? 0,
        totalPages: meta?.totalPages ?? 0,
        hasNextPage: meta?.hasNextPage ?? false,
        hasPrevPage: meta?.hasPrevPage ?? false,
    }

    return (
        <div className="flex flex-col gap-2">
            <form.AppForm>
                <div className="flex gap-2">
                    {startAddone}
                    <SearchField form={form} fields={{ q: 'q' }} placeholderMeta={placeholderMeta} />
                    {endAddone}
                </div>
            </form.AppForm>

            <DataTable<TData>
                columns={columns}
                data={query.data?.data ?? []}
                isLoading={query.isLoading}
                meta={tableMeta}
                pagination={pagination}
                onPaginationChange={setPagination}
                rowSelection={rowSelection}
                onRowSelectionChange={onRowSelectionChange}
            />
        </div>
    )
}