import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { useState } from "react";
import { DataTableSearch, DataTableToolbar } from "@/components/data-table";
import type { PaginationState } from "@/components/serachable-data-table";
import { DataTable } from "@/components/ui/data-table";
import { ClassFormDialog, columns } from "@/features/classes";
import { guardPermission } from "@/lib/route-guards";
import { baseTableSearchSchema } from "@/lib/table-search-schema";
import { useTRPC } from "@/lib/trpc";

export const Route = createFileRoute("/_authenticated/classes/")({
	validateSearch: baseTableSearchSchema,
	beforeLoad: guardPermission("academic.class.list"),
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const pagination: PaginationState = {
		pageIndex: search.page - 1,
		pageSize: search.limit,
	};

	const handlePaginationChange = (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
		const next = typeof updater === "function" ? updater(pagination) : updater;
		navigate({
			search: (prev) => ({
				...prev,
				page: next.pageIndex + 1,
				limit: next.pageSize,
			}),
			replace: true,
		});
	};

	const handleSearchChange = (q: string) => {
		navigate({
			search: (prev) => ({
				...prev,
				q,
				page: 1,
			}),
			replace: true,
		});
	};

	const query = useQuery({
		...trpc.classes.list.queryOptions({
			q: search.q,
			page: search.page,
			limit: search.limit,
		}),
		placeholderData: keepPreviousData,
	});

	const meta = {
		totalItems: query.data?.meta.totalItems ?? 0,
		totalPages: query.data?.meta.totalPages ?? 0,
		hasNextPage: query.data?.meta.hasNextPage ?? false,
		hasPrevPage: query.data?.meta.hasPrevPage ?? false,
	};

	return (
		<div className="flex flex-col gap-4">
			<DataTableToolbar>
				<div className="flex flex-1 items-center gap-2">
					<DataTableSearch
						placeholder="جستجوی نام کلاس..."
						value={search.q}
						onChange={handleSearchChange}
					/>
				</div>

				<div className="flex items-center gap-2">
					<ClassFormDialog />
				</div>
			</DataTableToolbar>
			
			<DataTable
				columns={columns}
				data={query.data?.data ?? []}
				isLoading={query.isLoading}
				meta={meta}
				pagination={pagination}
				onPaginationChange={handlePaginationChange}
				rowSelection={rowSelection}
				onRowSelectionChange={setRowSelection}
			/>
		</div>
	);
}

