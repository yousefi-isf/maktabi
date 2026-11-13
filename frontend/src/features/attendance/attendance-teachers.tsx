import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../backend/src/trpc/router.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/lib/permissions";
import { showSuccessToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";

type Classes =
	inferRouterOutputs<AppRouter>["attendance"]["classroom"]["classes"];

export function AttendanceTeachers({
	classes,
	selectedClassId,
}: {
	classes: Classes;
	selectedClassId: string;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { me } = getRouteApi("/_authenticated").useRouteContext();
	const teachers = useQuery(
		trpc.attendance.classroom.teachers.list.queryOptions(),
	);
	const create = useMutation(
		trpc.attendance.classroom.teachers.create.mutationOptions({
			meta: { silentToast: true },
		}),
	);
	const assign = useMutation(
		trpc.attendance.classroom.teachers.assignClass.mutationOptions({
			meta: { silentToast: true },
		}),
	);
	const invite = useMutation(
		trpc.users.invite.mutationOptions({ meta: { silentToast: true } }),
	);
	const [inviteLink, setInviteLink] = useState<{
		name: string;
		url: string;
	} | null>(null);
	const [createError, setCreateError] = useState("");
	const selectedClass = classes.find((item) => item.id === selectedClassId);
	const canCreate = hasPermission(me.permissions, {
		allOf: [
			"identity.user.create",
			"identity.role.assign",
			"attendance.record.create",
			"attendance.record.update",
		],
	});
	const canInvite = hasPermission(me.permissions, "identity.user.invite");
	return (
		<details className="rounded-xl border bg-card p-4">
			<summary className="cursor-pointer font-semibold">
				مدیریت معلمان و مسئول حضور کلاس
			</summary>
			<div className="mt-5 space-y-6">
				{canCreate && (
					<form
						className="grid gap-3 md:grid-cols-4"
						onSubmit={async (event) => {
							event.preventDefault();
							const form = event.currentTarget;
							const data = new FormData(form);
							setCreateError("");
							try {
								await create.mutateAsync({
									fullName: String(data.get("fullName")),
									email: String(data.get("email")),
									nationalCode: String(data.get("nationalCode")),
								});
								form.reset();
								await queryClient.invalidateQueries(
									trpc.attendance.classroom.teachers.list.pathFilter(),
								);
								showSuccessToast(
									"معلم با دسترسی حضور و غیاب ایجاد شد. اکنون کلاس و لینک دعوت را مشخص کنید.",
								);
							} catch (error) {
								setCreateError(
									error instanceof Error
										? error.message
										: "ایجاد معلم انجام نشد.",
								);
							}
						}}
					>
						<label className="grid gap-2 text-sm">
							نام و نام خانوادگی
							<Input
								name="fullName"
								required
								maxLength={200}
								disabled={create.isPending}
							/>
						</label>
						<label className="grid gap-2 text-sm">
							ایمیل ورود
							<Input
								name="email"
								type="email"
								dir="ltr"
								required
								disabled={create.isPending}
							/>
						</label>
						<label className="grid gap-2 text-sm">
							کد ملی
							<Input
								name="nationalCode"
								inputMode="numeric"
								pattern="[0-9]{10}"
								maxLength={10}
								dir="ltr"
								required
								disabled={create.isPending}
							/>
						</label>
						<Button
							type="submit"
							className="self-end"
							disabled={create.isPending}
						>
							{create.isPending ? "در حال ایجاد…" : "افزودن معلم"}
						</Button>
					</form>
				)}
				{createError && (
					<p role="alert" className="text-sm text-destructive">
						{createError}
					</p>
				)}
				{selectedClass && (
					<label className="grid max-w-lg gap-2 text-sm">
						مسئول تثبیت حضور برای {selectedClass.name}
						<select
							className="h-10 rounded-md border border-input bg-background px-3"
							disabled={assign.isPending}
							value={selectedClass.homeroomTeacherId ?? ""}
							onChange={async (event) => {
								try {
									await assign.mutateAsync({
										classId: selectedClass.id,
										teacherId: event.target.value || null,
									});
									await queryClient.invalidateQueries(
										trpc.attendance.classroom.classes.pathFilter(),
									);
									showSuccessToast("مسئول کلاس تعیین شد.");
								} catch (error) {
									showTRPCErrorToast(error);
								}
							}}
						>
							<option value="">مسئولی تعیین نشده</option>
							{teachers.data?.map((teacher) => (
								<option key={teacher.id} value={teacher.id}>
									{teacher.userSchool.user.fullName}
								</option>
							))}
						</select>
						<span className="text-xs leading-5 text-muted-foreground">
							معلم مسئول و دبیرانی که در برنامهٔ آموزشی به این کلاس مرتبط‌اند، به
							فهرست این کلاس دسترسی دارند.
						</span>
					</label>
				)}
				{teachers.error && (
					<p role="alert" className="text-sm text-destructive">
						{teachers.error.message}
					</p>
				)}
				<div className="divide-y rounded-lg border">
					{teachers.data?.map((teacher) => (
						<div
							key={teacher.id}
							className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
						>
							<div>
								<p className="font-medium">
									{teacher.userSchool.user.fullName}
								</p>
								<p className="mt-1 text-xs text-muted-foreground" dir="ltr">
									{teacher.userSchool.user.email}
								</p>
							</div>
							{teacher.userSchool.user.authAccounts.length ? (
								<span className="text-xs text-emerald-700 dark:text-emerald-400">
									ورود فعال است
								</span>
							) : (
								canInvite && (
									<Button
										variant="outline"
										size="sm"
										disabled={invite.isPending}
										onClick={async () => {
											try {
												const result = await invite.mutateAsync({
													userId: teacher.userId,
												});
												setInviteLink({
													name:
														result.user?.fullName ??
														teacher.userSchool.user.fullName,
													url: result.inviteUrl,
												});
											} catch (error) {
												showTRPCErrorToast(error);
											}
										}}
									>
										ساخت لینک دعوت
									</Button>
								)
							)}
						</div>
					))}
				</div>
				{inviteLink && (
					<div className="space-y-2 rounded-lg bg-muted/40 p-3">
						<label htmlFor="teacher-invite-url" className="text-sm">
							لینک تعیین رمز برای {inviteLink.name}
						</label>
						<Input
							id="teacher-invite-url"
							dir="ltr"
							readOnly
							value={inviteLink.url}
							onFocus={(event) => event.target.select()}
						/>
						<p className="text-xs text-muted-foreground">
							لینک را برای معلم بفرستید؛ پس از تعیین رمز با ایمیل خود وارد
							می‌شود. لینک جدید، دعوت قبلی را جایگزین می‌کند.
						</p>
					</div>
				)}
			</div>
		</details>
	);
}
