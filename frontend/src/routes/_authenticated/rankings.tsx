import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	type RankingFilterState,
	RankingsFilters,
	RankingsStats,
	RankingsTable,
} from '@/features/rankings';
import { guardPermission } from '@/lib/route-guards';
import { showSuccessToast, showTRPCErrorToast } from '@/lib/show-error-toast';
import { useTRPC } from '@/lib/trpc';

export const Route = createFileRoute('/_authenticated/rankings')({
	beforeLoad: guardPermission({
		anyOf: [
			'identity.student.list',
			'assessment.score.read',
			'system.full_access',
		],
	}),
	component: StudentRankingsView,
});

function StudentRankingsView() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [filters, setFilters] = useState<RankingFilterState>({
		academicYearId: '',
		gradeLevelId: '',
		fieldOfStudyId: '',
		classId: '',
	});

	// 1. Fetch filter options (years, grades, fields, classes)
	const filterOptionsQuery = useQuery(
		trpc.rankings.getFilterOptions.queryOptions()
	);

	// Initialize default academic year once options load
	useEffect(() => {
		if (filterOptionsQuery.data && !filters.academicYearId) {
			const activeYear =
				filterOptionsQuery.data.academicYears.find((y) => y.isActive) ||
				filterOptionsQuery.data.academicYears[0];
			if (activeYear) {
				setFilters((prev) => ({ ...prev, academicYearId: activeYear.id }));
			}
		}
	}, [filterOptionsQuery.data, filters.academicYearId]);

	// 2. Fetch rankings data
	const rankingsQuery = useQuery({
		...trpc.rankings.getStudentRankings.queryOptions({
			academicYearId: filters.academicYearId,
			gradeLevelId: filters.gradeLevelId || undefined,
			fieldOfStudyId: filters.fieldOfStudyId || undefined,
			classId: filters.classId || undefined,
		}),
		enabled: Boolean(filters.academicYearId),
	});

	// 3. Mutation to recalculate GPAs from Score table if requested
	const recalculateMutation = useMutation(
		trpc.rankings.recalculateGpas.mutationOptions()
	);

	const handleRecalculate = async () => {
		if (!filters.academicYearId) return;
		try {
			const res = await recalculateMutation.mutateAsync({
				academicYearId: filters.academicYearId,
				classId: filters.classId || undefined,
			});
			showSuccessToast(res.message);
			await queryClient.invalidateQueries(trpc.rankings.getStudentRankings.pathFilter());
		} catch (err) {
			showTRPCErrorToast(err);
		}
	};

	const handleFilterChange = (newFilters: Partial<RankingFilterState>) => {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	};

	return (
		<div className="space-y-6 ">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600">
							<Trophy className="w-4 h-4" />
						</div>
						<h1 className="text-xl font-bold tracking-tight">رتبه‌بندی تحصیلی دانش‌آموزان</h1>
					</div>
					<p className="text-xs text-muted-foreground">
						مشاهده گزارش معدل کل سالانه، رتبه در کلاس و رتبه در پایه و رشته تحصیلی
					</p>
				</div>
			</div>

			{/* Filters */}
			{filterOptionsQuery.data && (
				<RankingsFilters
					options={filterOptionsQuery.data}
					filters={filters}
					onFilterChange={handleFilterChange}
					onRecalculate={handleRecalculate}
					isRecalculating={recalculateMutation.isPending}
				/>
			)}

			{/* Loading State */}
			{(filterOptionsQuery.isLoading || (filters.academicYearId && rankingsQuery.isLoading)) && (
				<div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
					<Loader2 className="w-8 h-8 animate-spin text-primary" />
					<span className="text-xs">در حال بارگذاری اطلاعات رتبه‌بندی دانش‌آموزان...</span>
				</div>
			)}

			{/* Results & Stats */}
			{rankingsQuery.data && (
				<div className="space-y-6">
					<RankingsStats data={rankingsQuery.data} />

					<RankingsTable
						rankings={rankingsQuery.data.rankings}
						title={`لیست رتبه‌بندی سال تحصیلی ${rankingsQuery.data.academicYearTitle}`}
					/>
				</div>
			)}
		</div>
	);
}

