import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { BadgeCheck, XCircle, AlertCircle, BookOpen, Award } from 'lucide-react';
import type { SingleStudentReportCard } from './types';

interface StudentReportCardDialogProps {
	student: SingleStudentReportCard | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function StudentReportCardDialog({
	student,
	open,
	onOpenChange,
}: StudentReportCardDialogProps) {
	if (!student) return null;

	const theoreticalCourses = student.courses.filter((c) => !c.isModular);
	const modularCourses = student.courses.filter((c) => c.isModular);
	const isComplete = student.summary.totalUnitsPassed >= student.summary.totalUnitsTaken;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={true}
				className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6"
			>
				<DialogHeader className="border-b pb-4 text-right">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<DialogTitle className="text-lg font-bold flex items-center gap-2">
							<Award className="w-5 h-5 text-primary" />
							کارنامه تحصیلی: {student.student.firstName} {student.student.lastName}
						</DialogTitle>
						<span
							className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
								isComplete
									? 'bg-emerald-500/10 text-emerald-600'
									: 'bg-amber-500/10 text-amber-600'
							}`}
						>
							{isComplete ? 'قبول کامل' : `ناتمام (${student.summary.totalUnitsTaken - student.summary.totalUnitsPassed} واحد مانده)`}
						</span>
					</div>
					<DialogDescription className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-4">
						<span>کد ملی: <strong className="font-mono text-foreground">{student.student.nationalCode}</strong></span>
						<span>شماره دانش‌آموزی: <strong className="font-mono text-foreground">{student.student.studentNumber}</strong></span>
						{student.student.fatherName && (
							<span>نام پدر: <strong className="text-foreground">{student.student.fatherName}</strong></span>
						)}
						{student.student.birthDate && (
							<span>تاریخ تولد: <strong className="font-mono text-foreground">{student.student.birthDate}</strong></span>
						)}
					</DialogDescription>

					{/* Summary Chips */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t text-xs">
						<div className="bg-muted/50 p-2 rounded-md">
							<span className="text-muted-foreground block text-[11px]">معدل کل</span>
							<span className="font-mono font-bold text-sm text-foreground">
								{student.summary.gpa.toFixed(2)}
							</span>
						</div>
						<div className="bg-muted/50 p-2 rounded-md">
							<span className="text-muted-foreground block text-[11px]">واحد قبولی / کل</span>
							<span className="font-mono font-bold text-sm text-foreground">
								{student.summary.totalUnitsPassed} / {student.summary.totalUnitsTaken}
							</span>
						</div>
						<div className="bg-muted/50 p-2 rounded-md">
							<span className="text-muted-foreground block text-[11px]">مجموع نمرات</span>
							<span className="font-mono font-bold text-sm text-foreground">
								{student.summary.totalScoreSum.toFixed(2)}
							</span>
						</div>
						<div className="bg-muted/50 p-2 rounded-md">
							<span className="text-muted-foreground block text-[11px]">تعداد دروس</span>
							<span className="font-mono font-bold text-sm text-foreground">
								{student.courses.length} درس
							</span>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-6 pt-2">
					{/* Theoretical Courses Table */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
							<BookOpen className="w-4 h-4 text-primary" />
							<span>دروس عمومی و پایه (نظری - {theoreticalCourses.length} درس)</span>
						</div>
						<div className="border rounded-md overflow-hidden">
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow>
										<TableHead className="w-12 text-center text-xs">#</TableHead>
										<TableHead className="w-24 text-xs">کد درس</TableHead>
										<TableHead className="text-xs">عنوان درس</TableHead>
										<TableHead className="w-16 text-center text-xs">واحد</TableHead>
										<TableHead className="w-24 text-center text-xs">نمره سالانه</TableHead>
										<TableHead className="w-24 text-center text-xs">نتیجه</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{theoreticalCourses.map((c, idx) => {
										const score = c.annualScore ?? c.finalScore;
										const isPassed = c.isPassed && score >= 10;
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
												<TableCell className="text-center font-mono font-semibold text-xs">
													<span className={score >= 10 ? 'text-foreground' : 'text-destructive'}>
														{score.toFixed(2).replace(/\.00$/, '')}
													</span>
												</TableCell>
												<TableCell className="text-center">
													{isPassed ? (
														<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
															<BadgeCheck className="w-3.5 h-3.5" />
															قبول
														</span>
													) : (
														<span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
															<XCircle className="w-3.5 h-3.5" />
															مردود
														</span>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>

					{/* Modular Courses Table */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
							<BookOpen className="w-4 h-4 text-primary" />
							<span>دروس شایستگی فنی و پایه (پودمانی - {modularCourses.length} درس)</span>
						</div>
						<div className="border rounded-md overflow-hidden">
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow>
										<TableHead className="w-12 text-center text-xs">#</TableHead>
										<TableHead className="w-24 text-xs">کد درس</TableHead>
										<TableHead className="text-xs">عنوان درس</TableHead>
										<TableHead className="w-16 text-center text-xs">واحد</TableHead>
										<TableHead className="text-center text-xs">وضعیت پودمان‌ها (۵ پودمان)</TableHead>
										<TableHead className="w-24 text-center text-xs">نمره سالانه</TableHead>
										<TableHead className="w-24 text-center text-xs">نتیجه درس</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{modularCourses.map((c, idx) => {
										const score = c.annualScore ?? c.finalScore;
										const failedModules = c.modules.filter((m) => !m.isPassed || m.moduleFinalScore < 10);
										const isPassed = c.isPassed && failedModules.length === 0;

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
													{c.modules.length > 0 ? (
														<div className="flex items-center justify-center gap-1.5 flex-wrap">
															{c.modules.map((m) => {
																const pPassed = m.isPassed && m.moduleFinalScore >= 10;
																return (
																	<span
																		key={m.orderIndex}
																		title={`پودمان ${m.orderIndex}: ${m.title} - نمره: ${m.moduleFinalScore} (${pPassed ? 'قبول' : 'مردود'})`}
																		className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
																			pPassed
																				? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
																				: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
																		}`}
																	>
																		پ{m.orderIndex}: {pPassed ? '✓' : '✗'}
																	</span>
																);
															})}
														</div>
													) : (
														<span className="text-xs text-muted-foreground">-</span>
													)}
												</TableCell>
												<TableCell className="text-center font-mono font-semibold text-xs">
													<span className={isPassed ? 'text-foreground' : 'text-amber-600'}>
														{score.toFixed(2).replace(/\.00$/, '')}
													</span>
												</TableCell>
												<TableCell className="text-center">
													{isPassed ? (
														<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
															<BadgeCheck className="w-3.5 h-3.5" />
															قبول
														</span>
													) : (
														<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
															<AlertCircle className="w-3.5 h-3.5" />
															{failedModules.length > 0
																? `ناتمام (${failedModules.length} پودمان)`
																: 'ناتمام'}
														</span>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

