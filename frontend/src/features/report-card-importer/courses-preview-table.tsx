import React, { useMemo } from 'react';
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
	onUpdateBatch?: (batch: ReportCardBatchDto) => void;
}

interface AggregatedCourse {
	code: string;
	title: string;
	unit: number;
	isModular: boolean;
	modules?: { code: string; title: string; orderIndex: number }[];
	studentsCount: number;
	passedCount: number;
	failedCount: number;
	averageScore: number;
}

export function CoursesPreviewTable({ batch, onUpdateBatch }: CoursesPreviewTableProps) {
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
						modules: c.isModular ? c.modules.map(m => ({ code: m.code, title: m.title, orderIndex: m.orderIndex })).filter((v, i, a) => a.findIndex(t => (t.orderIndex === v.orderIndex)) === i) : undefined,
						studentsCount: 1,
						passedCount: isPassed ? 1 : 0,
						failedCount: isPassed ? 0 : 1,
						averageScore: score,
					});
				}
			}
		}

		for (const c of map.values()) {
			c.averageScore = c.studentsCount > 0 ? c.averageScore / c.studentsCount : 0;
		}

		return Array.from(map.values()).sort((a, b) => (b.passedCount / b.studentsCount) - (a.passedCount / a.studentsCount));
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
						فهرست دروس ارائه شده ({courses.length} درس - {totalUnits} واحد)
					</CardTitle>
					<span className="text-xs text-muted-foreground">
						استخراج شده از کارنامه تحصیلی
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
									<React.Fragment key={c.code || idx}>
										<TableRow>
											<TableCell className="text-center font-mono text-xs text-muted-foreground">
												{idx + 1}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{c.code}
											</TableCell>
											<TableCell className="font-medium text-xs p-1">
												<input
													type="text"
													className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
													defaultValue={c.title}
													onBlur={(e) => {
														const val = e.target.value.trim();
														if (!val || !onUpdateBatch || val === c.title) return;

														const newBatch = JSON.parse(JSON.stringify(batch)) as ReportCardBatchDto;
														for (const s of newBatch.students) {
															for (const crs of s.courses) {
																if (crs.code === c.code) {
																	crs.title = val;
																}
															}
														}
														onUpdateBatch(newBatch);
													}}
												/>
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
														({passRate.toFixed(0)}%)
													</span>
												</div>
											</TableCell>
										</TableRow>
										{c.isModular && c.modules && c.modules.length > 0 && (
											<TableRow className="bg-muted/10 border-b-2">
												<TableCell colSpan={2}></TableCell>
												<TableCell colSpan={7} className="p-2">
													<div className="flex flex-col gap-1.5 p-2 bg-background rounded-md border shadow-sm">
														<span className="text-xs font-semibold text-muted-foreground mb-1">پودمان‌های درس:</span>
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
															{c.modules.sort((a,b)=>a.orderIndex - b.orderIndex).map((m, mIdx) => (
																<div key={m.code || m.orderIndex} className="flex items-center gap-2">
																	<span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 w-16 text-center">
																		پودمان {m.orderIndex}
																	</span>
																	<input 
																		type="text" 
																		className="h-7 text-xs px-2 w-full max-w-[250px] bg-transparent border-b border-muted hover:border-border focus:border-primary focus:outline-none transition-colors"
																		defaultValue={m.title}
																		onBlur={(e) => {
																			const val = e.target.value.trim();
																			if (!val || !onUpdateBatch || val === m.title) return;

																			const newBatch = JSON.parse(JSON.stringify(batch)) as ReportCardBatchDto;
																			for (const s of newBatch.students) {
																				for (const crs of s.courses) {
																					if (crs.code === c.code && crs.isModular) {
																						for (const mod of crs.modules) {
																							if (mod.orderIndex === m.orderIndex) {
																								mod.title = val;
																							}
																						}
																					}
																				}
																			}
																			onUpdateBatch(newBatch);
																		}}
																	/>
																</div>
															))}
														</div>
													</div>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
