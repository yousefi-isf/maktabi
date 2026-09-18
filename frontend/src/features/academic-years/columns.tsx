import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { formatDate } from "@/lib/persian-date";
import { AcademicYearRowActions } from "./academic-year-row-actions";
import type { AcademicYear } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, AcademicYear>();

export const columns = columnHelper.columns([
	getSelectColumn<AcademicYear>(),
	columnHelper.accessor("title", {
		header: "عنوان سال تحصیلی",
	}),
	columnHelper.accessor("startDate", {
		header: "تاریخ شروع",
		cell: ({ getValue }) => {
			const date = getValue();
			return date ? formatDate(new Date(date), "yyyy/MM/dd") : "—";
		},
	}),
	columnHelper.accessor("endDate", {
		header: "تاریخ پایان",
		cell: ({ getValue }) => {
			const date = getValue();
			return date ? formatDate(new Date(date), "yyyy/MM/dd") : "—";
		},
	}),
	columnHelper.accessor("isActive", {
		header: "وضعیت",
		cell: ({ getValue }) => {
			const isActive = getValue();
			if (isActive) {
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
						فعال (جاری)
					</span>
				);
			}
			return (
				<span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-muted-foreground">
					غیرفعال
				</span>
			);
		},
	}),
	columnHelper.display({
		id: "actions",
		header: "عملیات",
		cell: ({ row }) => <AcademicYearRowActions academicYear={row.original} />,
		enableSorting: false,
		enableHiding: false,
	}),
]);

