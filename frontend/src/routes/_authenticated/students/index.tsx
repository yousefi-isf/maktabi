import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { FileUp, Trophy } from 'lucide-react';
import { useState } from 'react';
import { BulkDeleteButton, DataTableSearch, DataTableToolbar } from '@/components/data-table';
import type { PaginationState } from '@/components/serachable-data-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { CreateStudentDialog, columns } from '@/features/students';
import { guardPermission } from '@/lib/route-guards';
import { showInfoToast } from '@/lib/show-error-toast';
import { baseTableSearchSchema } from '@/lib/table-search-schema';
import { useTRPC } from '@/lib/trpc';

export const Route = createFileRoute('/_authenticated/students/')({
	validateSearch: baseTableSearchSchema,
	beforeLoad: guardPermission('identity.student.list'),
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

	const handlePaginationChange = (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
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

	const deleteStudents = useMutation(trpc.students.delete.mutationOptions());

	async function handleBulkRemove() {
		const studentIds = Object.keys(rowSelection);
		await deleteStudents.mutateAsync(
			{ studentIds },
			{
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.students.list.queryKey(),
					});
					showInfoToast(`(${studentIds.length}) دانش‌آموز با موفقیت حذف شد`);
					setRowSelection({});
				},
			},
		);
	}

	const query = useQuery({
		...trpc.students.list.queryOptions({
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
						placeholder="جستجو دانش‌آموزان..."
						value={search.q}
						onChange={handleSearchChange}
					/>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						render={<Link to="/rankings" />}
						className="flex items-center gap-2"
					>
						<Trophy className="w-4 h-4 text-amber-600" />
						رتبه‌بندی دانش‌آموزان
					</Button>
					<Button
						variant="outline"
						render={<Link to="/import" />}
						className="flex items-center gap-2"
					>
						<FileUp className="w-4 h-4" />
						بارگذاری کارنامه
					</Button>
					<CreateStudentDialog />
					<BulkDeleteButton
						disabled={isNotSelected}
						onConfirm={handleBulkRemove}
						title="حذف دانش‌آموزان ؟"
						description="این عملیات دانش‌آموزان انتخاب شده را از مدرسه حذف می‌کند"
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
