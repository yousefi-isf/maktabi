import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import { AlertTriangle, Clock, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTRPC, useTRPCClient } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export interface PunchItem {
	id: string;
	schoolId?: string;
	studentId: string | null;
	studentName: string | null;
	nationalCode: string | null;
	recordTime: Date | string;
	alreadyExists?: boolean;
}

export interface LivePunchesCardProps {
	className?: string;
	maxHeight?: string;
}

export function LivePunchesCard({
	className,
	maxHeight = "max-h-[520px]",
}: LivePunchesCardProps) {
	const trpc = useTRPC();
	const trpcClient = useTRPCClient();
	const [livePunches, setLivePunches] = useState<PunchItem[]>([]);

	// 1. Fetch initial logs for today
	const { data: initialLogs, isLoading } = useQuery({
		...trpc.attendance.punchLogs.list.queryOptions({}),
	});

	// 2. Subscribe to real-time events (punches)
	useEffect(() => {
		const punchSub = trpcClient.attendance.punchLogs.subscribe.subscribe(
			undefined,
			{
				onData(newPunch) {
					setLivePunches((prev) => {
						if (prev.some((p) => p.id === newPunch.id)) return prev;
						return [newPunch, ...prev];
					});
				},
				onError(err) {
					console.error("Punch subscription error:", err);
				},
			},
		);

		return () => {
			punchSub.unsubscribe();
		};
	}, [trpcClient]);

	// Combine live punches (newest first) with initial logs (also newest first)
	const allPunches = [
		...livePunches,
		...(initialLogs?.map((log) => ({
			id: log.id,
			schoolId: log.schoolId,
			studentId: log.studentId,
			studentName: log.student?.userSchool.user.fullName ?? null,
			nationalCode: log.student?.userSchool.user.nationalCode ?? null,
			recordTime: new Date(log.recordTime),
			alreadyExists: false,
		})) ?? []),
	].filter(
		(value, index, self) => index === self.findIndex((t) => t.id === value.id),
	); // Deduplicate

	return (
		<div
			className={cn(
				"rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col",
				className,
			)}
		>
			<div className="p-4 border-b bg-muted/20 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold text-base">لیست ترددها</h2>
					<span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
						زنده
					</span>
				</div>
				<span className="text-xs text-muted-foreground font-mono">
					{allPunches.length} تردد
				</span>
			</div>
			<div className={cn("overflow-auto flex-1", maxHeight)}>
				<table className="w-full text-sm text-left">
					<thead className="bg-muted/50 text-muted-foreground text-right border-b sticky top-0 bg-background/95 backdrop-blur-xs z-10">
						<tr>
							<th className="px-6 py-3.5 font-medium">دانش‌آموز</th>
							<th className="px-6 py-3.5 font-medium">کد ملی</th>
							<th className="px-6 py-3.5 font-medium">زمان ثبت</th>
							<th className="px-6 py-3.5 font-medium">وضعیت سیستم</th>
						</tr>
					</thead>
					<tbody className="divide-y text-right">
						{isLoading && allPunches.length === 0 ? (
							<tr>
								<td
									colSpan={4}
									className="px-6 py-8 text-center text-muted-foreground"
								>
									در حال دریافت اطلاعات...
								</td>
							</tr>
						) : allPunches.length === 0 ? (
							<tr>
								<td
									colSpan={4}
									className="px-6 py-8 text-center text-muted-foreground"
								>
									هیچ ترددی برای امروز ثبت نشده است.
								</td>
							</tr>
						) : (
							allPunches.map((punch) => (
								<tr
									key={punch.id}
									className="hover:bg-muted/30 transition-colors"
								>
									<td className="px-6 py-3.5">
										<div className="flex items-center gap-3">
											{punch.studentName ? (
												<div className="bg-primary/10 text-primary p-2 rounded-full">
													<UserCircle size={18} />
												</div>
											) : (
												<div className="bg-amber-500/10 text-amber-500 p-2 rounded-full">
													<AlertTriangle size={18} />
												</div>
											)}
											<span
												className={`font-medium ${!punch.studentName ? "text-amber-600" : ""}`}
											>
												{punch.studentName || "ناشناس (یافت نشد)"}
											</span>
										</div>
									</td>
									<td className="px-6 py-3.5 text-muted-foreground font-mono">
										{punch.nationalCode || "---"}
									</td>
									<td className="px-6 py-3.5 font-medium">
										<div className="flex items-center gap-1.5">
											<Clock size={14} className="text-muted-foreground" />
											<span dir="ltr" className="font-mono text-xs">
												{format(new Date(punch.recordTime), "HH:mm:ss")}
											</span>
										</div>
									</td>
									<td className="px-6 py-3.5">
										{punch.studentId ? (
											<span className="bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/20">
												موفق
											</span>
										) : (
											<span className="bg-amber-500/10 text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-500/20">
												نیاز به بررسی
											</span>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
