import { createColumnHelper } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { formatTimeAgo } from "@/hooks/use-time-ago";
import { SchoolRowActions } from "./school-row-actions";
import type { School } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, School>();

export const columns = columnHelper.columns([
    columnHelper.display({
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={
                    table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    }),
    columnHelper.accessor("name", {
        header: "نام",
    }),
    columnHelper.accessor("address", {
        header: "آدرس",
    }),
    columnHelper.accessor("city", {
        header: "شهر",
    }),
    columnHelper.accessor("district", {
        header: "منطقه",
    }),
    columnHelper.accessor("phone", {
        header: "تلفن",
    }),
    columnHelper.accessor("updatedAt", {
        header: "آخرین به‌روزرسانی",
        cell: ({ getValue }) => {
            const date = getValue();
            return formatTimeAgo(date);
        },
    }),
    columnHelper.display({
        id: "actions",
        header: "عملیات",
        cell: ({ row }) => <SchoolRowActions school={row.original} />,
        enableSorting: false,
        enableHiding: false,
    }),
]);

