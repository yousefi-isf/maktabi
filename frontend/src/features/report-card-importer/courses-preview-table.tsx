import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { BookOpen, CheckCircle2, Layers } from 'lucide-react';
import type { ReportCardBatchDto } from './types';

interface CoursesPreviewTableProps {
	batch: ReportCardBatchDto;
}

interface AggregatedCourse {
	code: string;
	title: string;
	unit: number;
	isModular: boolean;
	studentsCount: number;
	passedCount: number;
	failedCount: number;
	averageScore: number;
}

export function CoursesPreviewTable({ batch }: CoursesPreviewTableProps) {
	const courses = useMemo(() => {
		const map = new Map<string, AggregatedCourse>();

		for (const s of batch.students) {
			for (const c of s.courses) {
				const score = c.annualScore ?? c.finalScore;
				const isPassed = c.isPassed && (c.isModular ? c.modules.every((m) => m.isPassed && m.moduleFinalScore >= 10) : score >= 10);

				const existing = map.get(c.code);
				if (existing) {
					existing.studentsCount += 1;
					if (isPassed) existing.passedCount += 1;
					else existing.failedCount += 1;
					existing.averageScore += score;
				} else {
					map.set(c.code, {
						code: c.code,
						title: c.title,
						unit: c.unit,
						isModular: c.isModular,
						studentsCount: 1,
						passedCount: isPassed ? 1 : 0,
						failedCount: isPassed ? 0 : 1,
						averageScore: score,
					});
				}
			}
		}

		return Array.from(map.values()).map((c) => ({
			...c,
			averageScore: c.studentsCount > 0 ? c.averageScore / c.studentsCount : 0,
		}));
	}, [batch]);

	const totalUnits = courses.reduce((acc, c) => acc + c.unit, 0);
	const theoreticalCourses = courses.filter((c) => !c.isModular);
	const modularCourses = courses.filter((c) => c.isModular);

	return (
		<div className="space-y-4">
			{/* Summary stats */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
				<Card className="p-3 bg-muted/40">
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">کل دروس کلاس</span>
						<BookOpen className="w-4 h-4 text-primary" />
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-2xl font-bold font-mono">{courses.length}</span>
						<span className="text-xs text-muted-foreground">عنوان درسی</span>
					</div>
				</Card>

				<Card className="p-3 bg-muted/40">
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">مجموع واحدها</span>
						<Layers className="w-4 h-4 text-primary" />
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-2xl font-bold font-mono">{totalUnits}</span>
						<span className="text-xs text-muted-foreground">واحد درسی</span>
					</div>
				</Card>

				<Card className="p-3 bg-muted/40">
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">دروس عمومی (نظری)</span>
						<CheckCircle2 className="w-4 h-4 text-sky-600" />
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-2xl font-bold font-mono">{theoreticalCourses.length}</span>
						<span className="text-xs text-muted-foreground">
							درس ({theoreticalCourses.reduce((a, c) => a + c.unit, 0)} واحد)
						</span>
					</div>
				</Card>

				<Card className="p-3 bg-muted/40">
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">دروس تخصصی (پودمانی)</span>
						<CheckCircle2 className="w-4 h-4 text-indigo-600" />
					</div>
					<div className="mt-2 flex items-baseline gap-2">
						<span className="text-2xl font-bold font-mono">{modularCourses.length}</span>
						<span className="text-xs text-muted-foreground">
							درس ({modularCourses.reduce((a, c) => a + c.unit, 0)} واحد)
						</span>
					</div>
				</Card>
			</div>

			{/* Courses Table */}
			<Card>
				<CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
					<CardTitle className="text-base font-medium">
						فهرست دروس ارائه‌شده ({courses.length} درس - {totalUnits} واحد)
					</CardTitle>
					<span className="text-xs text-muted-foreground">
						استخراج‌شده از کارنامه تحصیلی دوره دهم حسابداری
					</span>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12 text-center">#</TableHead>
								<TableHead className="w-24">کد درس</TableHead>
								<TableHead>عنوان درس</TableHead>
								<TableHead className="w-20 text-center">تعداد واحد</TableHead>
								<TableHead className="w-28 text-center">نوع ساختار</TableHead>
								<TableHead className="w-28 text-center">تعداد پودمان</TableHead>
								<TableHead className="w-28 text-center">میانگین کلاس</TableHead>
								<TableHead className="w-32 text-center">آمار قبولی کلاس</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{courses.map((c, idx) => {
								const passRate = c.studentsCount > 0 ? (c.passedCount / c.studentsCount) * 100 : 0;
								return (
									<TableRow key={c.code || idx}>
										<TableCell className="text-center font-mono text-xs text-muted-foreground">
											{idx + 1}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{c.code}
										</TableCell>
										<TableCell className="font-medium text-xs">
											{c.title}
										</TableCell>
										<TableCell className="text-center font-mono text-xs">
											{c.unit}
										</TableCell>
										<TableCell className="text-center">
											{c.isModular ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-600">
													پودمانی
												</span>
											) : (
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-600">
													نظری (عمومی)
												</span>
											)}
										</TableCell>
										<TableCell className="text-center font-mono text-xs text-muted-foreground">
											{c.isModular ? '۵ پودمان' : '-'}
										</TableCell>
										<TableCell className="text-center font-mono text-xs font-semibold">
											<span className={c.averageScore >= 12 ? 'text-foreground' : 'text-amber-600'}>
												{c.averageScore.toFixed(2)}
											</span>
										</TableCell>
										<TableCell className="text-center font-mono text-xs">
											<div className="flex items-center justify-center gap-1.5">
												<span className="text-emerald-600 font-semibold">{c.passedCount}</span>
												<span className="text-muted-foreground">/</span>
												<span>{c.studentsCount}</span>
												<span className="text-[10px] text-muted-foreground">
													({passRate.toFixed(0)}٪)
												</span>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

