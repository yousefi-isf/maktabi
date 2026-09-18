import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { stageLabels } from "./grade-level-fields";
import { GradeLevelRowActions } from "./grade-level-row-actions";
import type { GradeLevel } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, GradeLevel>();

export const columns = columnHelper.columns([
	getSelectColumn<GradeLevel>(),
	columnHelper.accessor("title", {
		header: "عنوان پایه",
	}),
	columnHelper.accessor("stage", {
		header: "مقطع تحصیلی",
		cell: ({ getValue }) => {
			const stage = getValue();
			const label = stageLabels[stage] ?? stage;
			return <div>{label}</div>;
		},
	}),
	columnHelper.accessor("orderIndex", {
		header: "ترتیب",
		cell: ({ getValue }) => <div className="font-mono text-center">{getValue()}</div>,
	}),
	columnHelper.display({
		id: "actions",
		header: "عملیات",
		cell: ({ row }) => <GradeLevelRowActions gradeLevel={row.original} />,
		enableSorting: false,
		enableHiding: false,
	}),
]);
