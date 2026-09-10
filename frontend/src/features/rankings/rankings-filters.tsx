import { RefreshCw, Filter, Calendar, GraduationCap, BookOpen, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RankingFilterOptions, RankingFilterState } from './types';

interface RankingsFiltersProps {
	options: RankingFilterOptions;
	filters: RankingFilterState;
	onFilterChange: (filters: Partial<RankingFilterState>) => void;
	onRecalculate: () => void;
	isRecalculating: boolean;
}

export function RankingsFilters({
	options,
	filters,
	onFilterChange,
	onRecalculate,
	isRecalculating,
}: RankingsFiltersProps) {
	// Filter classes based on selected grade and field
	const filteredClasses = options.classes.filter((c) => {
		if (filters.academicYearId && c.academicYearId !== filters.academicYearId) return false;
		if (filters.gradeLevelId && c.gradeLevelId !== filters.gradeLevelId) return false;
		if (filters.fieldOfStudyId && c.fieldOfStudyId !== filters.fieldOfStudyId) return false;
		return true;
	});

	return (
		<div className="bg-card border rounded-xl p-4 shadow-xs space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
				<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
					<Filter className="w-4 h-4 text-primary" />
					<span>فیلترهای رتبه‌بندی تحصیلی</span>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={onRecalculate}
					disabled={isRecalculating || !filters.academicYearId}
					className="h-8 text-xs flex items-center gap-1.5 hover:bg-muted cursor-pointer"
					title="محاسبه مجدد معدل همه دانش‌آموزان از روی نمرات خام جدول Score"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
					<span>{isRecalculating ? 'در حال محاسبه مجدد...' : 'همگام‌سازی و محاسبه مجدد معدل‌ها'}</span>
				</Button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{/* 1. Academic Year */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
						<Calendar className="w-3.5 h-3.5" />
						<span>سال تحصیلی:</span>
					</label>
					<select
						value={filters.academicYearId}
						onChange={(e) =>
							onFilterChange({
								academicYearId: e.target.value,
								classId: '', // Reset class on year change
							})
						}
						className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
					>
						{options.academicYears.map((y) => (
							<option key={y.id} value={y.id}>
								{y.title} {y.isActive ? '(فعال)' : ''}
							</option>
						))}
					</select>
				</div>

				{/* 2. Grade Level */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
						<GraduationCap className="w-3.5 h-3.5" />
						<span>پایه تحصیلی:</span>
					</label>
					<select
						value={filters.gradeLevelId}
						onChange={(e) =>
							onFilterChange({
								gradeLevelId: e.target.value,
								classId: '', // Reset class on grade change
							})
						}
						className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
					>
						<option value="">همه پایه‌ها</option>
						{options.gradeLevels.map((g) => (
							<option key={g.id} value={g.id}>
								{g.title}
							</option>
						))}
					</select>
				</div>

				{/* 3. Field of Study */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
						<BookOpen className="w-3.5 h-3.5" />
						<span>رشته تحصیلی:</span>
					</label>
					<select
						value={filters.fieldOfStudyId}
						onChange={(e) =>
							onFilterChange({
								fieldOfStudyId: e.target.value,
								classId: '', // Reset class on field change
							})
						}
						className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
					>
						<option value="">همه رشته‌ها</option>
						{options.fieldsOfStudy.map((f) => (
							<option key={f.id} value={f.id}>
								{f.title}
							</option>
						))}
					</select>
				</div>

				{/* 4. Class */}
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
						<School className="w-3.5 h-3.5" />
						<span>کلاس درس:</span>
					</label>
					<select
						value={filters.classId}
						onChange={(e) => onFilterChange({ classId: e.target.value })}
						className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
					>
						<option value="">همه کلاس‌ها ({filteredClasses.length} کلاس)</option>
						{filteredClasses.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}

