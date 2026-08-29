import { Button } from "./button"
import type { PaginationState, TableMeta } from "./data-table"

interface TablePaginationProps {
    meta: TableMeta
    pagination: PaginationState
    onPaginationChange: (
        updater: PaginationState | ((prev: PaginationState) => PaginationState),
    ) => void
}

export function TablePagination({
    meta,
    pagination,
    onPaginationChange,
}: TablePaginationProps) {
    return (
        <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
                صفحه {pagination.pageIndex + 1} از {meta.totalPages || 1} — مجموع {meta.totalItems} رکورد
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        onPaginationChange((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))
                    }
                    disabled={!meta.hasPrevPage}
                >
                    قبلی
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        onPaginationChange((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
                    }
                    disabled={!meta.hasNextPage}
                >
                    بعدی
                </Button>
            </div>
        </div>
    )
}
