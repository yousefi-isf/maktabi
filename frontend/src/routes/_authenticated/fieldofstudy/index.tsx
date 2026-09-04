import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { useState } from 'react';
import { BulkDeleteButton, DataTableSearch, DataTableToolbar } from '@/components/data-table';
import type { PaginationState } from '@/components/serachable-data-table';
import { DataTable } from '@/components/ui/data-table';
import { CreateFieldOfStudyDialog, columns } from '@/features/fieldofstudy';
import { guardPermission } from '@/lib/route-guards';
import { showInfoToast, showTRPCErrorToast } from '@/lib/show-error-toast';
import { baseTableSearchSchema } from '@/lib/table-search-schema';
import { useTRPC } from '@/lib/trpc';

export const Route = createFileRoute('/_authenticated/fieldofstudy/')({
	validateSearch: baseTableSearchSchema,
	beforeLoad: guardPermission('academic.field.list'),
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const isNotSelected = Object.keys(rowSelection).length === 0;

	const pagination: PaginationState = {
		pageIndex: search.page - 1,
		pageSize: search.limit,
	};

	const handlePaginationChange = (
		updater: PaginationState | ((prev: PaginationState) => PaginationState),
	) => {
		const next = typeof updater === 'function' ? updater(pagination) : updater;
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

	const deleteFieldOfStudy = useMutation(
		trpc.fieldsOfStudy.delete.mutationOptions({
			onError: (error) => {
				showTRPCErrorToast(error);
			},
		}),
	);

	async function handleBulkRemove() {
		const id = Object.keys(rowSelection);
		await deleteFieldOfStudy.mutateAsync(
			{ id },
			{
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.fieldsOfStudy.list.queryKey(),
					});
					showInfoToast(`(${id.length}) رشته تحصیلی با موفقیت حذف شد`);
					setRowSelection({});
				},
			},
		);
	}

	const query = useQuery({
		...trpc.fieldsOfStudy.list.queryOptions({
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
						placeholder="جستجو رشته‌های تحصیلی..."
						value={search.q}
						onChange={handleSearchChange}
					/>
				</div>

				<div className="flex items-center gap-2">
					<CreateFieldOfStudyDialog />
					<BulkDeleteButton
						disabled={isNotSelected}
						onConfirm={handleBulkRemove}
						title="حذف رشته‌های تحصیلی؟"
						description="این عملیات برای همیشه رشته‌های انتخاب‌شده را حذف می‌کند"
					/>
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
