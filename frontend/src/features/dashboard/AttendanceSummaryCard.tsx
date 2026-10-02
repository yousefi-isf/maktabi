import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
	RotateCcw,
	Search,
	UserCheck,
	Users,
	UserX,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { Input } from "@/components/ui/input";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
	addDays,
	formatDate,
	isSameDay,
	isToday,
	today,
} from "@/lib/persian-date";
import { useTRPC } from "@/lib/trpc";

type Tab = "absent" | "present" | "all";

interface StudentSummaryItem {
	studentId: string;
	fullName: string;
	nationalCode: string | null;
	firstPunchAt?: Date | string | null;
	isPresent?: boolean;
}

function normalizeSearchText(text: string): string {
	return normalizePersianDigits(text)
		.toLowerCase()
		.replace(/[\u064A\u0649]/g, "ی") // Arabic Yeh to Persian Ye
		.replace(/[\u0643]/g, "ک") // Arabic Kaf to Persian Ke
		.replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width spaces
		.replace(/\s+/g, " ")
		.trim();
}

export function AttendanceSummaryCard() {
	const trpc = useTRPC();
	const [selectedDate, setSelectedDate] = useState<Date>(() => today());
	const [activeTab, setActiveTab] = useState<Tab>("absent");
	const [searchQuery, setSearchQuery] = useState<string>("");

	const isSelectedToday = isToday(selectedDate);

	// Convert selected date to Gregorian YYYY-MM-DD for the API
	const dateParam = useMemo(() => {
		const year = selectedDate.getFullYear();
		const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
		const day = String(selectedDate.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}, [selectedDate]);

	const { data, isLoading, isError, refetch, isFetching } = useQuery({
		...trpc.attendance.punchLogs.todaySummary.queryOptions({
			date: dateParam,
		}),
		refetchInterval: isSelectedToday ? 2000 : false,
	});

	// Date navigation helpers
	const goToPreviousDay = () => {
		setSelectedDate((prev) => addDays(prev, -1));
	};

	const goToNextDay = () => {
		setSelectedDate((prev) => {
			const nextDay = addDays(prev, 1);
			return nextDay.getTime() > today().getTime() ? prev : nextDay;
		});
	};

	const goToToday = () => {
		setSelectedDate(today());
	};

	// Build unified student list
	const allStudents = useMemo<StudentSummaryItem[]>(() => {
		if (!data) return [];
		const presentList: StudentSummaryItem[] = (data.present ?? []).map((s) => ({
			...s,
			isPresent: true,
		}));
		const absentList: StudentSummaryItem[] = (data.absent ?? []).map((s) => ({
			...s,
			isPresent: false,
		}));
		return [...presentList, ...absentList];
	}, [data]);

	// Filter according to active tab
	const currentTabStudents = useMemo<StudentSummaryItem[]>(() => {
		if (!data) return [];
		if (activeTab === "all") return allStudents;
		if (activeTab === "present") {
			return (data.present ?? []).map((s) => ({ ...s, isPresent: true }));
		}
		return (data.absent ?? []).map((s) => ({ ...s, isPresent: false }));
	}, [data, activeTab, allStudents]);

	// Filter according to search query
	const normQuery = useMemo(
		() => normalizeSearchText(searchQuery),
		[searchQuery],
	);

	const filteredStudents = useMemo(() => {
		if (!normQuery) return currentTabStudents;
		return currentTabStudents.filter((s) => {
			const nameNorm = normalizeSearchText(s.fullName);
			const codeNorm = normalizeSearchText(s.nationalCode ?? "");
			return nameNorm.includes(normQuery) || codeNorm.includes(normQuery);
		});
	}, [currentTabStudents, normQuery]);

	// Suggest matches in other tab if active tab yields zero results
	const crossTabMatch = useMemo(() => {
		if (!normQuery || filteredStudents.length > 0 || activeTab === "all") {
			return null;
		}
		const matches = allStudents.filter((s) => {
			const nameNorm = normalizeSearchText(s.fullName);
			const codeNorm = normalizeSearchText(s.nationalCode ?? "");
			return nameNorm.includes(normQuery) || codeNorm.includes(normQuery);
		});
		if (matches.length === 0) return null;
		const targetTab: Tab = matches[0].isPresent ? "present" : "absent";
		return {
			count: matches.length,
			targetTab,
		};
	}, [normQuery, filteredStudents.length, activeTab, allStudents]);

	return (
		<div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
			{/* Top Header: Title & Day Navigation */}
			<div className="p-5 border-b bg-muted/20 flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-2.5">
					<div className="flex items-center gap-2">
						<h2 className="font-semibold text-base">وضعیت حضور و غیاب</h2>
						{isSelectedToday ? (
							<span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
								امروز (زنده)
							</span>
						) : (
							<span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
								آرشیو روزانه
							</span>
						)}
					</div>

					{/* Date controls */}
					<div className="flex items-center gap-1 bg-background/80 border rounded-lg p-0.5 shadow-2xs backdrop-blur-xs">
						{/* Previous day (chevron right in RTL) */}
						<button
							type="button"
							onClick={goToPreviousDay}
							className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
							title="روز قبل"
						>
							<ChevronRight size={15} />
						</button>

						{/* Shamsi Date Picker Popover */}
						<JalaliDatePicker
							value={selectedDate}
							onChange={setSelectedDate}
							maxDate={today()}
							triggerClassName="text-xs py-1 px-2 font-medium"
						/>

						{/* Next day (chevron left in RTL) */}
						<button
							type="button"
							onClick={goToNextDay}
							disabled={isSelectedToday}
							className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
							title="روز بعد"
						>
							<ChevronLeft size={15} />
						</button>

						{/* Return to today button if viewing a past day */}
						{!isSelectedToday && (
							<button
								type="button"
								onClick={goToToday}
								className="px-2 py-0.5 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors cursor-pointer mr-0.5"
							>
								امروز
							</button>
						)}

						{/* Manual refetch */}
						<button
							type="button"
							onClick={() => refetch()}
							className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
							title="بروزرسانی داده‌ها"
						>
							<RotateCcw
								size={13}
								className={isFetching ? "animate-spin" : ""}
							/>
						</button>
					</div>
				</div>

				{/* 3 Summary Tab Cards */}
				<div className="grid grid-cols-3 gap-3">
					{/* Total Students Tab */}
					<button
						type="button"
						onClick={() => setActiveTab("all")}
						className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all cursor-pointer ${
							activeTab === "all"
								? "bg-blue-500/20 border-blue-500/40 ring-2 ring-blue-500/30"
								: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15"
						}`}
					>
						<Users className="text-blue-500" size={20} />
						<span className="text-2xl font-bold text-blue-600">
							{isLoading ? (
								<Loader2 size={20} className="animate-spin" />
							) : (
								(data?.totalStudents ?? 0)
							)}
						</span>
						<span className="text-xs text-muted-foreground">کل دانش‌آموزان</span>
					</button>

					{/* Present Tab */}
					<button
						type="button"
						onClick={() => setActiveTab("present")}
						className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all cursor-pointer ${
							activeTab === "present"
								? "bg-emerald-500/20 border-emerald-500/40 ring-2 ring-emerald-500/30"
								: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
						}`}
					>
						<UserCheck className="text-emerald-500" size={20} />
						<span className="text-2xl font-bold text-emerald-600">
							{isLoading ? (
								<Loader2 size={20} className="animate-spin" />
							) : (
								(data?.presentCount ?? 0)
							)}
						</span>
						<span className="text-xs text-muted-foreground">حاضر</span>
					</button>

					{/* Absent Tab */}
					<button
						type="button"
						onClick={() => setActiveTab("absent")}
						className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all cursor-pointer ${
							activeTab === "absent"
								? "bg-rose-500/20 border-rose-500/40 ring-2 ring-rose-500/30"
								: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15"
						}`}
					>
						<UserX className="text-rose-500" size={20} />
						<span className="text-2xl font-bold text-rose-600">
							{isLoading ? (
								<Loader2 size={20} className="animate-spin" />
							) : (
								(data?.absentCount ?? 0)
							)}
						</span>
						<span className="text-xs text-muted-foreground">غایب</span>
					</button>
				</div>
			</div>

			{/* Progress bar */}
			{data && data.totalStudents > 0 && (
				<div className="px-5 pt-3">
					<div className="flex justify-between text-xs text-muted-foreground mb-1">
						<span>درصد حضور ({formatDate(selectedDate, "d MMMM")})</span>
						<span dir="ltr">
							{Math.round((data.presentCount / data.totalStudents) * 100)}%
						</span>
					</div>
					<div className="w-full h-2 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-emerald-500 rounded-full transition-all duration-500"
							style={{
								width: `${(data.presentCount / data.totalStudents) * 100}%`,
							}}
						/>
					</div>
				</div>
			)}

			{/* Search Input Bar */}
			<div className="p-3 border-b bg-muted/10 space-y-2">
				<div className="relative">
					<Search
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
						size={15}
					/>
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="جستجو بر اساس نام یا کد ملی دانش‌آموز..."
						className="pr-9 pl-8 h-9 text-xs"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
							title="پاک کردن جستجو"
						>
							<X size={14} />
						</button>
					)}
				</div>

				<div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
					<span>
						{activeTab === "all"
							? "لیست کل دانش‌آموزان"
							: activeTab === "present"
								? "لیست دانش‌آموزان حاضر"
								: "لیست دانش‌آموزان غایب"}
					</span>
					<span>
						{normQuery ? (
							<span className="text-primary font-medium">
								{filteredStudents.length} مورد یافت شد
							</span>
						) : (
							<span>{filteredStudents.length} دانش‌آموز</span>
						)}
					</span>
				</div>
			</div>

			{/* Student list */}
			<div className="flex-1 overflow-auto max-h-80">
				{isLoading && (
					<div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
						<Loader2 size={16} className="animate-spin" />
						<span className="text-sm">در حال بارگذاری اطلاعات...</span>
					</div>
				)}
				{isError && (
					<div className="flex items-center justify-center py-10 text-rose-500 text-sm">
						خطا در بارگذاری اطلاعات
					</div>
				)}
				{!isLoading && !isError && (
					<>
						{/* Cross-tab search match suggestion */}
						{crossTabMatch && (
							<div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg m-3 border border-dashed flex flex-col items-center gap-1.5">
								<p>
									دانش‌آموزی با این مشخصات در لیست{" "}
									<span className="font-semibold text-foreground">
										{activeTab === "absent" ? "غایبین" : "حاضرین"}
									</span>{" "}
									یافت نشد.
								</p>
								<button
									type="button"
									onClick={() => setActiveTab(crossTabMatch.targetTab)}
									className="text-primary font-medium hover:underline cursor-pointer"
								>
									مشاهده در لیست{" "}
									{crossTabMatch.targetTab === "present"
										? "حاضرین"
										: "غایبین"}{" "}
									({crossTabMatch.count} مورد)
								</button>
							</div>
						)}

						{filteredStudents.length === 0 ? (
							<div className="py-8 text-center text-sm text-muted-foreground px-4">
								{normQuery ? (
									<span>دانش‌آموزی با این نام یا کد ملی یافت نشد.</span>
								) : activeTab === "present" ? (
									<span>هنوز برای این تاریخ حضوری ثبت نشده است.</span>
								) : activeTab === "absent" ? (
									<span>همه دانش‌آموزان حاضرند! 🎉</span>
								) : (
									<span>دانش‌آموزی ثبت نشده است.</span>
								)}
							</div>
						) : (
							<ul className="divide-y">
								{filteredStudents.map((student) => {
									const isStudentPresent = student.isPresent ?? false;
									return (
										<li
											key={student.studentId}
											className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/20 transition-colors"
										>
											<div
												className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
													isStudentPresent
														? "bg-emerald-500/10 text-emerald-600"
														: "bg-rose-500/10 text-rose-600"
												}`}
											>
												{isStudentPresent ? (
													<UserCheck size={14} />
												) : (
													<UserX size={14} />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{student.fullName}
												</p>
												<p className="text-xs text-muted-foreground font-mono">
													{student.nationalCode || "فاقد کد ملی"}
												</p>
											</div>

											{isStudentPresent && student.firstPunchAt ? (
												<div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full font-mono shrink-0">
													<Clock size={11} />
													<span dir="ltr">
														{format(new Date(student.firstPunchAt), "HH:mm")}
													</span>
												</div>
											) : (
												<div className="text-xs text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0 font-medium">
													غایب
												</div>
											)}
										</li>
									);
								})}
							</ul>
						)}
					</>
				)}
			</div>
		</div>
	);
}
