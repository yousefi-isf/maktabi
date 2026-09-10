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
import type { ReportCardBatchDto } from './types';

interface ScoresMatrixPreviewTableProps {
	batch: ReportCardBatchDto;
}

export function ScoresMatrixPreviewTable({ batch }: ScoresMatrixPreviewTableProps) {
	// Extract distinct courses list
	const courses = useMemo(() => {
		const map = new Map<string, { code: string; title: string; unit: number; isModular: boolean }>();
		for (const s of batch.students) {
			for (const c of s.courses) {
				if (!map.has(c.code)) {
					map.set(c.code, {
						code: c.code,
						title: c.title,
						unit: c.unit,
						isModular: c.isModular,
					});
				}
			}
		}
		return Array.from(map.values());
	}, [batch]);

	return (
		<Card>
			<CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
				<CardTitle className="text-base font-medium">
					ماتریس نمرات سالانه کلاس ({batch.students.length} دانش‌آموز × {courses.length} درس)
				</CardTitle>
				<span className="text-xs text-muted-foreground">
					نمرات قرمز یا نارنجی نشان‌دهنده نمره زیر ۱۰ یا پودمان ناتمام است
				</span>
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto max-w-full">
					<Table className="text-xs min-w-[1200px]">
						<TableHeader className="bg-muted/50">
							<TableRow>
								<TableHead className="w-10 text-center sticky right-0 bg-muted/90 z-20 shadow-[1px_0_0_0_hsl(var(--border))]">
									#
								</TableHead>
								<TableHead className="w-40 sticky right-10 bg-muted/90 z-20 shadow-[1px_0_0_0_hsl(var(--border))]">
									نام دانش‌آموز
								</TableHead>
								<TableHead className="w-28 text-center">کد ملی</TableHead>

								{courses.map((c) => (
									<TableHead
										key={c.code}
										className="text-center font-normal px-2 max-w-[100px] truncate"
										title={`${c.title} (${c.unit} واحد) [${c.isModular ? 'پودمانی' : 'نظری'}]`}
									>
										<span className="block font-medium truncate">{c.title}</span>
										<span className="text-[10px] text-muted-foreground">
											{c.unit} واحد {c.isModular ? '(پ)' : ''}
										</span>
									</TableHead>
								))}

								<TableHead className="w-20 text-center font-bold">معدل</TableHead>
								<TableHead className="w-24 text-center">واحد قبولی</TableHead>
								<TableHead className="w-24 text-center">وضعیت</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{batch.students.map((s, idx) => {
								const isComplete = s.summary.totalUnitsPassed >= s.summary.totalUnitsTaken;
								const courseMap = new Map(s.courses.map((c) => [c.code, c]));

								return (
									<TableRow key={s.student.nationalCode || idx} className="hover:bg-muted/30">
										<TableCell className="text-center font-mono text-xs text-muted-foreground sticky right-0 bg-background z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
											{idx + 1}
										</TableCell>
										<TableCell className="font-medium sticky right-10 bg-background z-10 shadow-[1px_0_0_0_hsl(var(--border))] whitespace-nowrap">
											{s.student.firstName} {s.student.lastName}
										</TableCell>
										<TableCell className="text-center font-mono text-muted-foreground">
											{s.student.nationalCode}
										</TableCell>

										{courses.map((c) => {
											const sc = courseMap.get(c.code);
											if (!sc) {
												return (
													<TableCell key={c.code} className="text-center text-muted-foreground">
														-
													</TableCell>
												);
											}

											const score = sc.annualScore ?? sc.finalScore;
											const failedModules = sc.isModular
												? sc.modules.filter((m) => !m.isPassed || m.moduleFinalScore < 10)
												: [];
											const isPassed = sc.isPassed && failedModules.length === 0 && score >= 10;

											return (
												<TableCell key={c.code} className="text-center font-mono p-1">
													<div className="flex flex-col items-center justify-center">
														<span
															className={`font-semibold ${
																isPassed
																	? 'text-foreground'
																	: sc.isModular
																	? 'text-amber-600'
																	: 'text-destructive'
															}`}
														>
															{score.toFixed(2).replace(/\.00$/, '')}
														</span>
														{sc.isModular && failedModules.length > 0 && (
															<span
																className="text-[9px] text-amber-600 font-sans"
																title={`${failedModules.length} پودمان ناتمام`}
															>
																{failedModules.length} مانده
															</span>
														)}
													</div>
												</TableCell>
											);
										})}

										<TableCell className="text-center font-mono font-bold">
											<span className={s.summary.gpa >= 12 ? 'text-foreground' : 'text-destructive'}>
												{s.summary.gpa.toFixed(2)}
											</span>
										</TableCell>

										<TableCell className="text-center font-mono text-xs">
											<span className={isComplete ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
												{s.summary.totalUnitsPassed}
											</span>
											{' '}/ {s.summary.totalUnitsTaken}
										</TableCell>

										<TableCell className="text-center whitespace-nowrap">
											{isComplete ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600">
													قبول کامل
												</span>
											) : (
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600">
													{s.summary.totalUnitsTaken - s.summary.totalUnitsPassed} واحد مانده
												</span>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

