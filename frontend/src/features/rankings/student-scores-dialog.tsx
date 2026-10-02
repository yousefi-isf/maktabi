import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	Award,
	BadgeCheck,
	BarChart3,
	BookOpen,
	GraduationCap,
	Loader2,
	User,
	XCircle,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/lib/trpc";

interface StudentScoresDialogProps {
	studentId: string | null;
	academicYearId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function ScoreBadge({ value }: { value: number | null }) {
	if (value === null)
		return <span className="text-muted-foreground text-xs">-</span>;
	const color =
		value >= 17
			? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
			: value >= 14
				? "text-sky-700 dark:text-sky-400 bg-sky-500/10"
				: value >= 10
					? "text-foreground bg-muted"
					: "text-rose-700 dark:text-rose-400 bg-rose-500/10";
	return (
		<span
			className={`inline-block px-2 py-0.5 rounded font-mono font-semibold text-xs ${color}`}
		>
			{value.toFixed(2).replace(/\.00$/, "")}
		</span>
	);
}

export function StudentScoresDialog({
	studentId,
	academicYearId,
	open,
	onOpenChange,
}: StudentScoresDialogProps) {
	const trpc = useTRPC();

	const { data, isLoading, isError } = useQuery({
		...trpc.rankings.getStudentScoreDetail.queryOptions({
			studentId: studentId ?? "",
			academicYearId,
		}),
		enabled: open && !!studentId,
	});

	const theoreticalSubjects = data?.subjects.filter((s) => !s.isModular) ?? [];
	const modularSubjects = data?.subjects.filter((s) => s.isModular) ?? [];
	const isComplete = data
		? data.enrollment.totalUnitsPassed >= data.enrollment.totalUnitsTaken &&
			data.enrollment.gpa >= 10
		: false;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={true}
				className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-0"
			>
				{isLoading && (
					<div className="flex flex-col items-center justify-center py-24 gap-3">
						<Loader2 className="w-8 h-8 animate-spin text-primary" />
						<span className="text-sm text-muted-foreground">
							در حال بارگذاری ریزنمرات...
						</span>
					</div>
				)}

				{isError && (
					<div className="flex flex-col items-center justify-center py-24 gap-2 text-rose-500">
						<AlertCircle className="w-8 h-8" />
						<span className="text-sm">خطا در بارگذاری اطلاعات</span>
					</div>
				)}

				{data && (
					<>
						{/* ── Header ── */}
						<DialogHeader className="p-6 border-b bg-muted/30 text-right">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<DialogTitle className="text-lg font-bold flex items-center gap-2">
									<Award className="w-5 h-5 text-amber-500" />
									کارنامه تفصیلی: {data.student.fullName}
								</DialogTitle>
								<span
									className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
										isComplete
											? "bg-emerald-500/10 text-emerald-600"
											: "bg-amber-500/10 text-amber-600"
									}`}
								>
									{isComplete ? (
										<>
											<BadgeCheck className="w-3.5 h-3.5" />
											قبول کامل
										</>
									) : (
										<>
											<AlertCircle className="w-3.5 h-3.5" />
											ناتمام
										</>
									)}
								</span>
							</div>

							{/* Student meta info */}
							<DialogDescription className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<User className="w-3.5 h-3.5 shrink-0" />
									کد ملی:
									<strong className="font-mono text-foreground">
										{data.student.nationalCode}
									</strong>
								</span>
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<User className="w-3.5 h-3.5 shrink-0" />
									شماره دانش‌آموزی:
									<strong className="font-mono text-foreground">
										{data.student.studentNumber}
									</strong>
								</span>
								{data.student.fatherName && (
									<span className="text-muted-foreground">
										نام پدر:{" "}
										<strong className="text-foreground">
											{data.student.fatherName}
										</strong>
									</span>
								)}
								{data.student.birthDate && (
									<span className="text-muted-foreground">
										تاریخ تولد:{" "}
										<strong className="font-mono text-foreground">
											{data.student.birthDate}
										</strong>
									</span>
								)}
								<span className="flex items-center gap-1.5 text-muted-foreground">
									<GraduationCap className="w-3.5 h-3.5 shrink-0" />
									کلاس:
									<strong className="text-foreground">
										{data.enrollment.className}
									</strong>
								</span>
								<span className="text-muted-foreground">
									پایه / رشته:
									<strong className="text-foreground mr-1">
										{data.enrollment.gradeTitle} — {data.enrollment.fieldTitle}
									</strong>
								</span>
								<span className="text-muted-foreground">
									سال تحصیلی:
									<strong className="text-foreground mr-1">
										{data.enrollment.academicYearTitle}
									</strong>
								</span>
							</DialogDescription>

							{/* Summary chips */}
							<div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t">
								{[
									{
										label: "معدل مستمر",
										value: data.enrollment.continuousGpa.toFixed(2),
										color: "sky",
									},
									{
										label: "معدل پایانی",
										value: data.enrollment.finalGpa.toFixed(2),
										color: "indigo",
									},
									{
										label: "معدل کل",
										value: data.enrollment.gpa.toFixed(2),
										color: "amber",
									},
									{
										label: "واحد قبولی",
										value: `${data.enrollment.totalUnitsPassed} / ${data.enrollment.totalUnitsTaken}`,
										color:
											data.enrollment.totalUnitsPassed >=
											data.enrollment.totalUnitsTaken
												? "emerald"
												: "rose",
									},
									{
										label: "مجموع نمرات",
										value: data.enrollment.totalScoreSum.toFixed(1),
										color: "slate",
									},
									{
										label: "تعداد دروس",
										value: `${data.subjects.length} درس`,
										color: "slate",
									},
								].map((chip) => (
									<div
										key={chip.label}
										className="bg-muted/60 rounded-md p-2 text-center"
									>
										<span className="text-[10px] text-muted-foreground block mb-0.5">
											{chip.label}
										</span>
										<span className="font-mono font-bold text-sm">
											{chip.value}
										</span>
									</div>
								))}
							</div>
						</DialogHeader>

						{/* ── Body ── */}
						<div className="p-6 space-y-8">
							{/* Theoretical subjects */}
							{theoreticalSubjects.length > 0 && (
								<section className="space-y-2">
									<h3 className="flex items-center gap-2 text-sm font-semibold">
										<BookOpen className="w-4 h-4 text-primary" />
										دروس نظری ({theoreticalSubjects.length} درس)
									</h3>
									<div className="border rounded-lg overflow-hidden">
										<Table>
											<TableHeader className="bg-muted/50">
												<TableRow>
													<TableHead className="w-8 text-center text-xs">
														#
													</TableHead>
													<TableHead className="w-20 text-xs">کد</TableHead>
													<TableHead className="text-xs">نام درس</TableHead>
													<TableHead className="text-xs">دبیر</TableHead>
													<TableHead className="w-12 text-center text-xs">
														واحد
													</TableHead>
													<TableHead className="w-20 text-center text-xs">
														مستمر ن.۱
													</TableHead>
													<TableHead className="w-20 text-center text-xs">
														پایانی ن.۱
													</TableHead>
													<TableHead className="w-20 text-center text-xs">
														مستمر ن.۲
													</TableHead>
													<TableHead className="w-20 text-center text-xs">
														پایانی ن.۲
													</TableHead>
													<TableHead className="w-20 text-center text-xs font-semibold">
														معدل مستمر
													</TableHead>
													<TableHead className="w-20 text-center text-xs font-semibold">
														معدل پایانی
													</TableHead>
													<TableHead className="w-20 text-center text-xs font-bold">
														معدل سالانه
													</TableHead>
													<TableHead className="w-20 text-center text-xs">
														نتیجه
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{theoreticalSubjects.map((subj, idx) => {
													const byType = (type: string, term1: boolean) =>
														subj.scores.find(
															(s) =>
																s.examType === type &&
																(term1
																	? s.examTitle.includes("نوبت اول")
																	: !s.examTitle.includes("نوبت اول")),
														);
													const c1 = byType("continuous", true);
													const c2 = byType("continuous", false);
													const f1 = byType("term_final", true);
													const f2 = byType("term_final", false);

													const scoreCell = (s: typeof c1) => {
														if (!s)
															return (
																<span className="text-muted-foreground text-xs">
																	-
																</span>
															);
														if (s.isAbsent)
															return (
																<span className="text-xs text-rose-500 font-medium">
																	غ
																</span>
															);
														return <ScoreBadge value={s.score} />;
													};

													return (
														<TableRow
															key={subj.subjectId}
															className={`transition-colors hover:bg-muted/20 ${!subj.isPassed ? "bg-rose-500/5" : ""}`}
														>
															<TableCell className="text-center font-mono text-xs text-muted-foreground">
																{idx + 1}
															</TableCell>
															<TableCell className="font-mono text-xs text-muted-foreground">
																{subj.subjectCode}
															</TableCell>
															<TableCell className="font-medium text-xs">
																{subj.subjectName}
															</TableCell>
															<TableCell className="text-xs text-muted-foreground">
																{subj.teacherName}
															</TableCell>
															<TableCell className="text-center font-mono text-xs">
																{subj.unit}
															</TableCell>
															<TableCell className="text-center">
																{scoreCell(c1)}
															</TableCell>
															<TableCell className="text-center">
																{scoreCell(f1)}
															</TableCell>
															<TableCell className="text-center">
																{scoreCell(c2)}
															</TableCell>
															<TableCell className="text-center">
																{scoreCell(f2)}
															</TableCell>
															<TableCell className="text-center">
																<ScoreBadge value={subj.continuousAvg} />
															</TableCell>
															<TableCell className="text-center">
																<ScoreBadge value={subj.finalAvg} />
															</TableCell>
															<TableCell className="text-center">
																<ScoreBadge value={subj.overallAvg} />
															</TableCell>
															<TableCell className="text-center">
																{subj.isPassed ? (
																	<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
																		<BadgeCheck className="w-3.5 h-3.5" />
																		قبول
																	</span>
																) : (
																	<span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
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
								</section>
							)}

							{/* Modular subjects */}
							{modularSubjects.length > 0 && (
								<section className="space-y-2">
									<h3 className="flex items-center gap-2 text-sm font-semibold">
										<BarChart3 className="w-4 h-4 text-primary" />
										دروس پودمانی ({modularSubjects.length} درس)
									</h3>
									<div className="border rounded-lg overflow-hidden">
										<Table>
											<TableHeader className="bg-muted/50">
												<TableRow>
													<TableHead className="w-8 text-center text-xs">
														#
													</TableHead>
													<TableHead className="w-20 text-xs">کد</TableHead>
													<TableHead className="text-xs">نام درس</TableHead>
													<TableHead className="text-xs">دبیر</TableHead>
													<TableHead className="w-12 text-center text-xs">
														واحد
													</TableHead>
													<TableHead className="text-center text-xs">
														وضعیت پودمان‌ها
													</TableHead>
													<TableHead className="w-20 text-center text-xs font-bold">
														میانگین
													</TableHead>
													<TableHead className="w-20 text-center text-xs">
														نتیجه
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{modularSubjects.map((subj, idx) => {
													const modFinals = subj.scores
														.filter((s) => s.examType === "modular_competency")
														.sort(
															(a, b) =>
																(a.moduleOrderIndex ?? 0) -
																(b.moduleOrderIndex ?? 0),
														);

													return (
														<TableRow
															key={subj.subjectId}
															className={`transition-colors hover:bg-muted/20 ${!subj.isPassed ? "bg-amber-500/5" : ""}`}
														>
															<TableCell className="text-center font-mono text-xs text-muted-foreground">
																{idx + 1}
															</TableCell>
															<TableCell className="font-mono text-xs text-muted-foreground">
																{subj.subjectCode}
															</TableCell>
															<TableCell className="font-medium text-xs">
																{subj.subjectName}
															</TableCell>
															<TableCell className="text-xs text-muted-foreground">
																{subj.teacherName}
															</TableCell>
															<TableCell className="text-center font-mono text-xs">
																{subj.unit}
															</TableCell>
															<TableCell>
																{modFinals.length > 0 ? (
																	<div className="flex items-center gap-1.5 flex-wrap">
																		{modFinals.map((m) => {
																			const passed =
																				!m.isAbsent && (m.score ?? 0) >= 10;
																			return (
																				<span
																					key={m.moduleOrderIndex}
																					title={`پودمان ${m.moduleOrderIndex}: ${m.moduleTitle ?? ""} — نمره: ${m.isAbsent ? "غ" : (m.score ?? "-")}`}
																					className={`inline-flex flex-col items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
																						passed
																							? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
																							: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
																					}`}
																				>
																					<span>پ{m.moduleOrderIndex}</span>
																					<span>
																						{m.isAbsent
																							? "غ"
																							: (m.score?.toFixed(0) ?? "-")}
																					</span>
																				</span>
																			);
																		})}
																	</div>
																) : (
																	<span className="text-xs text-muted-foreground">
																		-
																	</span>
																)}
															</TableCell>
															<TableCell className="text-center">
																<ScoreBadge value={subj.overallAvg} />
															</TableCell>
															<TableCell className="text-center">
																{subj.isPassed ? (
																	<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
																		<BadgeCheck className="w-3.5 h-3.5" />
																		قبول
																	</span>
																) : (
																	<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
																		<AlertCircle className="w-3.5 h-3.5" />
																		ناتمام
																	</span>
																)}
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>
								</section>
							)}

							{data.subjects.length === 0 && (
								<div className="text-center py-12 text-sm text-muted-foreground">
									هیچ نمره‌ای برای این دانش‌آموز در این سال تحصیلی ثبت نشده است.
								</div>
							)}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
