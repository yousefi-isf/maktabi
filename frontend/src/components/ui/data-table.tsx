import { type ColumnDef, type RowData, type RowSelectionState, useTable } from "@tanstack/react-table"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useControllableState } from "@/hooks/use-controllable-state";
import { Button } from "./button"
import { type DataTableFeatures, features } from "./table-features"

interface PaginationState {
    pageIndex: number
    pageSize: number
}

interface TableMeta {
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
}

interface DataTableProps<TData extends RowData & { id: string | number }> {
    columns: ColumnDef<DataTableFeatures, TData>[]
    data: TData[]
    isLoading?: boolean
    meta: TableMeta
    pagination: PaginationState
    onPaginationChange: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
    rowSelection?: RowSelectionState
    onRowSelectionChange?: (value: RowSelectionState) => void
}

export function DataTable<TData extends RowData & { id: string | number }>({
    columns,
    data,
    isLoading,
    meta,
    pagination,
    onPaginationChange,
    rowSelection: rowSelectionProp,
    onRowSelectionChange,
}: DataTableProps<TData>) {
    const [rowSelection, setRowSelection] = useControllableState<RowSelectionState>({
        value: rowSelectionProp,
        defaultValue: {},
        onChange: onRowSelectionChange,
    })
    const table = useTable({
        features,
        data,
        columns,
        manualPagination: true,
        rowCount: meta.totalItems,
        getRowId: (row) => String(row.id),
        state: { pagination, rowSelection },
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const next = typeof updater === "function" ? updater(pagination) : updater
            onPaginationChange(next)
        },
    })

    return (
        <div>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pagination.pageSize > 4 ? 5 : pagination.pageSize }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    {columns.map((_column, cellIndex) => (
                                        <TableCell key={cellIndex}>
                                            <Skeleton className="h-5 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            <table.FlexRender cell={cell} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    نتیجه‌ای یافت نشد.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4 sticky bottom-0 bg-background">
                <div className="text-sm text-muted-foreground">
                    صفحه {pagination.pageIndex + 1} از {meta.totalPages || 1} — مجموع {meta.totalItems} رکورد
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPaginationChange((p: typeof pagination) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                        disabled={!meta.hasPrevPage}
                    >
                        قبلی
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPaginationChange((p: typeof pagination) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                        disabled={!meta.hasNextPage}
                    >
                        بعدی
                    </Button>
                </div>
            </div>
        </div>
    )
}