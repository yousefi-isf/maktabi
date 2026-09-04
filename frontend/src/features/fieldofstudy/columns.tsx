import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
// import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { branchLabels } from "./fieldofstudy-fields";
import { FieldOfStudyRowActions } from "./fieldofstudy-row-actions";
import type { FieldOfStudy } from "./types";

const columnHelper = createColumnHelper<DataTableFeatures, FieldOfStudy>();

export const columns = columnHelper.columns([
	getSelectColumn<FieldOfStudy>(),
	columnHelper.accessor("title", {
		header: "عنوان رشته",
	}),
	columnHelper.accessor("branch", {
		header: "شاخه تحصیلی",
		cell: ({ getValue }) => {
			const branch = getValue();
			const label = branchLabels[branch] ?? branch;
			const variant =
				branch === "theoretical"
					? "secondary"
					: branch === "technical"
						? "outline"
						: "default";
			return <div>{label}</div>;
		},
	}),
	columnHelper.display({
		id: "actions",
		header: "عملیات",
		cell: ({ row }) => <FieldOfStudyRowActions fieldOfStudy={row.original} />,
		enableSorting: false,
		enableHiding: false,
	}),
]);

