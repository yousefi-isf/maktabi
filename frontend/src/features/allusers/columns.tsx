import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { formatTimeAgo } from "@/hooks/use-time-ago";
import type { AllUsers } from "./types";
import { UserRowActions } from "./user-row-actions";

const columnHelper = createColumnHelper<DataTableFeatures, AllUsers>();

export const columns = columnHelper.columns([
	getSelectColumn<AllUsers>(),
	columnHelper.accessor("fullName", {
		header: "نام و نام خانوادگی",
	}),
	columnHelper.accessor("phone", {
		header: "شماره تماس",
		cell: ({ getValue }) => getValue() || "—",
	}),
	columnHelper.accessor("email", {
		header: "ایمیل",
	}),
	columnHelper.accessor("nationalCode", {
		header: "کد ملی",
	}),
	columnHelper.accessor((row) => row.schools?.map((s) => s.name).join("، ") || "—", {
		id: "schools",
		header: "مدارس",
		cell: ({ getValue }) => getValue() || "—",
	}),
	columnHelper.accessor("updatedAt", {
		header: "آخرین به‌روزرسانی",
		cell: ({ getValue }) => {
			const date = getValue();
			return date ? formatTimeAgo(date) : "—";
		},
	}),
	columnHelper.display({
		id: "actions",
		header: "عملیات",
		cell: ({ row }) => <UserRowActions user={row.original} />,
		enableSorting: false,
		enableHiding: false,
	}),
]);
