import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../backend/src/trpc/router.js";
import { Button } from "@/components/ui/button";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/lib/permissions";
import { guardPermission } from "@/lib/route-guards";
import { showSuccessToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import { AttendanceTeachers } from "@/features/attendance/attendance-teachers";

export const Route = createFileRoute("/_authenticated/attendance/classroom")({
	beforeLoad: guardPermission({
		anyOf: [
			"attendance.record.create",
			"attendance.record.update",
			"attendance.record.read",
		],
	}),
	component: ClassroomAttendance,
});

type Roster =
	inferRouterOutputs<AppRouter>["attendance"]["classroom"]["roster"];
type Status = "present" | "absent" | "late" | "excused";
const labels: Record<Status, string> = {
	present: "حاضر",
	absent: "غایب",
	late: "با تأخیر",
	excused: "غیبت موجه",
};
const selectStyle =
	"h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const dateInTehran = (value = new Date()) =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Tehran",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(value);

function ClassroomAttendance() {
	const trpc = useTRPC();
	const { me } = Route.useRouteContext();
	const canManage = hasPermission(me.permissions, "enrollment.teacher.assign");
	const canConfirm = hasPermission(me.permissions, "attendance.record.create");
	const [classId, setClassId] = useState("");
	const [date, setDate] = useState(() => dateInTehran());
	const [termId, setTermId] = useState("");
	const classes = useQuery(trpc.attendance.classroom.classes.queryOptions());
	const selectedClass =
		classes.data?.find((item) => item.id === classId) ?? classes.data?.[0];
	const activeClassId = selectedClass?.id ?? "";
	const terms = selectedClass?.academicYear.terms ?? [];
	const activeTermId =
		termId ||
		terms.find(
			(term) =>
				new Date(term.startDate) <= new Date(date) &&
				new Date(term.endDate) >= new Date(date),
		)?.id ||
		terms[0]?.id ||
		"";
	const roster = useQuery({
		...trpc.attendance.classroom.roster.queryOptions({
			classId: activeClassId,
			date,
		}),
		enabled: Boolean(activeClassId && date),
		refetchOnWindowFocus: false,
		refetchInterval: 30_000,
	});
	return (
		<div className="space-y-6 p-4 md:p-6" dir="rtl">
			<div>
				<h1 className="text-2xl font-bold">تثبیت حضور روزانهٔ کلاس</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					ثبت دستگاه مرحلهٔ اول است. پس از بررسی دانش‌آموزان در کلاس، وضعیت نهایی
					را ثبت کنید.
				</p>
			</div>
			<div className="flex flex-wrap gap-4 rounded-xl border bg-card p-4">
				<label className="grid gap-2 text-sm">
					کلاس
					<select
						className={selectStyle}
						value={activeClassId}
						onChange={(event) => {
							setClassId(event.target.value);
							setTermId("");
						}}
					>
						<option value="" disabled>
							انتخاب کلاس
						</option>
						{classes.data?.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name} — {item.academicYear.title}
							</option>
						))}
					</select>
				</label>
				<label className="grid gap-2 text-sm">
					تاریخ
					<JalaliDatePicker
						value={new Date(`${date}T12:00:00+03:30`)}
						maxDate={new Date()}
						onChange={(value) => setDate(dateInTehran(value))}
					/>
				</label>
				<label className="grid gap-2 text-sm">
					نوبت تحصیلی
					<select
						className={selectStyle}
						value={activeTermId}
						onChange={(event) => setTermId(event.target.value)}
					>
						<option value="" disabled>
							انتخاب نوبت
						</option>
						{terms.map((term) => (
							<option key={term.id} value={term.id}>
								{term.title}
							</option>
						))}
					</select>
				</label>
			</div>
			{(classes.isLoading || roster.isFetching) && (
				<p className="text-sm text-muted-foreground">در حال دریافت اطلاعات…</p>
			)}
			{(classes.error || roster.error) && (
				<p role="alert" className="text-sm text-destructive">
					{classes.error?.message || roster.error?.message}
				</p>
			)}
			{classes.data?.length === 0 && (
				<p className="rounded-xl border p-6 text-sm text-muted-foreground">
					کلاسی برای شما تعریف نشده است. مدیر باید مسئول حضور و غیاب کلاس را
					مشخص کند.
				</p>
			)}
			{selectedClass && !terms.length && (
				<p role="alert" className="text-sm text-destructive">
					برای سال تحصیلی این کلاس نوبتی تعریف نشده است.
				</p>
			)}
			{roster.data && (
				<RosterEditor
					key={`${activeClassId}:${date}`}
					roster={roster.data}
					classId={activeClassId}
					date={date}
					termId={activeTermId}
					canConfirm={canConfirm}
				/>
			)}
			{canManage && (
				<AttendanceTeachers
					classes={classes.data ?? []}
					selectedClassId={activeClassId}
				/>
			)}
		</div>
	);
}

function RosterEditor({
	roster,
	classId,
	date,
	termId,
	canConfirm,
}: {
	roster: Roster;
	classId: string;
	date: string;
	termId: string;
	canConfirm: boolean;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [edits, setEdits] = useState<
		Partial<Record<string, { status: Status; note: string }>>
	>({});
	const records = roster.map((student) => ({
		studentId: student.studentId,
		status:
			student.confirmation?.status ??
			(student.firstPunch ? ("present" as Status) : ("absent" as Status)),
		note: student.confirmation?.note ?? "",
		...edits[student.studentId],
	}));
	function updateRecord(
		index: number,
		patch: Partial<{ status: Status; note: string }>,
	) {
		const record = records[index];
		setEdits((previous) => ({
			...previous,
			[record.studentId]: {
				status: record.status,
				note: record.note,
				...patch,
			},
		}));
	}

	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const mutation = useMutation(
		trpc.attendance.classroom.confirm.mutationOptions({
			meta: { silentToast: true },
		}),
	);
	const confirmedCount = roster.filter(
		(student) => student.confirmation,
	).length;
	async function save() {
		if (isSaving) return;
		const invalid = records.find((record) => {
			const student = roster.find(
				(student) => student.studentId === record.studentId,
			)!;
			return (
				(record.status === "excused" ||
					(["present", "late"].includes(record.status) &&
						!student.firstPunch)) &&
				!record.note.trim()
			);
		});
		if (invalid) {
			setError(
				`برای ${roster.find((student) => student.studentId === invalid.studentId)?.fullName} توضیح حضور دستی یا غیبت موجه را وارد کنید.`,
			);
			return;
		}
		setError("");
		setIsSaving(true);
		try {
			await mutation.mutateAsync({ classId, date, termId, records });
			showSuccessToast("وضعیت نهایی حضور و غیاب کلاس ثبت شد.");
			await queryClient.invalidateQueries(
				trpc.attendance.classroom.roster.pathFilter(),
			);
			setEdits({});
			await queryClient.invalidateQueries(
				trpc.attendance.punchLogs.todaySummary.pathFilter(),
			);
		} catch (error) {
			setError(error instanceof Error ? error.message : "ثبت انجام نشد.");
		} finally {
			setIsSaving(false);
		}
	}
	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-center gap-4 text-sm">
				<span>{roster.length} دانش‌آموز</span>
				<span className="text-muted-foreground">
					{roster.filter((student) => student.firstPunch).length} ثبت دستگاه
				</span>
				<span className="text-emerald-700 dark:text-emerald-400">
					{confirmedCount} تأیید نهایی
				</span>
				<span className="text-amber-700 dark:text-amber-400">
					{roster.length - confirmedCount} در انتظار بررسی
				</span>
			</div>
			<div className="overflow-x-auto rounded-xl border">
				<table className="w-full text-right text-sm">
					<thead className="bg-muted/50">
						<tr>
							{[
								"دانش‌آموز",
								"مرحلهٔ اول: دستگاه",
								"مرحلهٔ دوم: تأیید کلاس",
								"وضعیت نهایی",
								"توضیح",
							].map((title) => (
								<th key={title} className="whitespace-nowrap p-3 font-medium">
									{title}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y">
						{roster.map((student, index) => {
							const record = records[index];
							const manual =
								["present", "late"].includes(record.status) &&
								!student.firstPunch;
							return (
								<tr key={student.studentId} className="align-top">
									<td className="whitespace-nowrap p-3 font-medium">
										{student.fullName}
									</td>
									<td className="p-3 whitespace-nowrap">
										{student.firstPunch ? (
											<span>
												ثبت‌شده ·{" "}
												{new Intl.DateTimeFormat("fa-IR", {
													timeZone: "Asia/Tehran",
													hour: "2-digit",
													minute: "2-digit",
												}).format(new Date(student.firstPunch.recordTime))}
											</span>
										) : (
											<span className="text-muted-foreground">ثبت نشده</span>
										)}
									</td>
									<td className="p-3 min-w-44">
										{student.confirmation ? (
											<>
												<span className="text-emerald-700 dark:text-emerald-400">
													{labels[student.confirmation.status]}
													{student.confirmation.manualOverride ? " · دستی" : ""}
												</span>
												<span className="mt-1 block text-xs text-muted-foreground">
													{student.confirmation.confirmedBy?.fullName ??
														"ثبت قبلی"}
													{student.confirmation.confirmedAt
														? ` · ${new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" }).format(new Date(student.confirmation.confirmedAt))}`
														: ""}
												</span>
											</>
										) : (
											<span className="text-amber-700 dark:text-amber-400">
												در انتظار تثبیت
											</span>
										)}
									</td>
									<td className="p-3">
										<select
											aria-label={`وضعیت ${student.fullName}`}
											className={selectStyle}
											disabled={!canConfirm || isSaving}
											value={record.status}
											onChange={(event) =>
												updateRecord(index, {
													status: event.target.value as Status,
												})
											}
										>
											{Object.entries(labels).map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
										</select>
										{manual && (
											<span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">
												تأیید دستی؛ توضیح الزامی
											</span>
										)}
									</td>
									<td className="p-3 min-w-56">
										<Input
											aria-label={`توضیح ${student.fullName}`}
											disabled={!canConfirm || isSaving}
											maxLength={1000}
											value={record.note}
											placeholder={
												manual || record.status === "excused"
													? "توضیح الزامی است"
													: "توضیح اختیاری"
											}
											onChange={(event) =>
												updateRecord(index, { note: event.target.value })
											}
										/>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				{!roster.length && (
					<p className="p-6 text-center text-muted-foreground">
						دانش‌آموز فعالی در این کلاس ثبت نشده است.
					</p>
				)}
			</div>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			{canConfirm && roster.length > 0 && (
				<Button onClick={save} disabled={isSaving || !termId}>
					{isSaving ? "در حال ثبت…" : "تأیید و ثبت وضعیت کلاس"}
				</Button>
			)}
		</section>
	);
}
