import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { StudentRowActions } from "./student-row-actions";
import type { Student } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, Student>();

const statusLabels: Record<string, string> = {
	active: "فعال",
	inactive: "غیرفعال",
	left: "انصرافی",
};

export const columns = columnHelper.columns([
	getSelectColumn<Student>(),
	columnHelper.accessor("fullName", {
		header: "نام و نام خانوادگی",
	}),
	columnHelper.accessor("studentNumber", {
		header: "شماره دانش‌آموزی",
	}),
	columnHelper.accessor("nationalCode", {
		header: "کد ملی",
	}),
	columnHelper.accessor("email", {
		header: "ایمیل",
	}),
	columnHelper.accessor("phone", {
		header: "شماره تماس",
		cell: ({ getValue }) => getValue() || "—",
	}),
	columnHelper.accessor("status", {
		header: "وضعیت",
		cell: ({ getValue }) => {
			const status = getValue();
			return statusLabels[status] ?? status;
		},
	}),
	columnHelper.display({
		id: "actions",
		header: "عملیات",
		cell: ({ row }) => <StudentRowActions student={row.original} />,
		enableSorting: false,
		enableHiding: false,
	}),
]);

