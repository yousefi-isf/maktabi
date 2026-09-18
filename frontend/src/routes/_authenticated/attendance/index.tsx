import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Fingerprint, UserCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns-jalali';
import { guardPermission } from '@/lib/route-guards';
import { useTRPC, useTRPCClient } from '@/lib/trpc';
import type { PunchResult } from '../../../../backend/src/modules/attendance/punch.service';

export const Route = createFileRoute('/_authenticated/attendance/')({
	beforeLoad: guardPermission({
		anyOf: ['attendance.record.read', 'attendance.record.read.own'],
	}),
	component: AttendanceDashboard,
});

function AttendanceDashboard() {
	const trpc = useTRPC();
	const trpcClient = useTRPCClient();
	const [livePunches, setLivePunches] = useState<PunchResult[]>([]);
	const [deviceStatus, setDeviceStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

	// 1. Fetch initial logs & status for today
	const { data: initialLogs, isLoading } = useQuery({
		...trpc.attendance.punchLogs.list.queryOptions({}),
	});

	const { data: initialStatus } = useQuery({
		...trpc.attendance.deviceStatus.current.queryOptions(),
	});

	useEffect(() => {
		if (initialStatus && initialStatus !== 'unknown') {
			setDeviceStatus(initialStatus as 'connected' | 'disconnected');
		} else if (initialStatus === 'unknown' && deviceStatus === 'unknown') {
			setDeviceStatus('unknown');
		}
	}, [initialStatus]);

	// 2. Subscribe to real-time events (punches and status)
	useEffect(() => {
		const punchSub = trpcClient.attendance.punchLogs.subscribe.subscribe(undefined, {
			onData(newPunch) {
				setLivePunches((prev) => {
					if (prev.some((p) => p.id === newPunch.id)) return prev;
					return [newPunch, ...prev];
				});
			},
			onError(err) {
				console.error('Punch subscription error:', err);
			},
		});

		const statusSub = trpcClient.attendance.deviceStatus.subscribe.subscribe(undefined, {
			onData(status) {
				setDeviceStatus(status);
			},
			onError(err) {
				console.error('Status subscription error:', err);
			},
		});

		return () => {
			punchSub.unsubscribe();
			statusSub.unsubscribe();
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
	].filter((value, index, self) => index === self.findIndex((t) => t.id === value.id)); // Deduplicate

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">داشبورد زنده حضور و غیاب</h1>
					<p className="text-muted-foreground mt-1">مانیتورینگ لحظه‌ای دستگاه کارت‌ساعت</p>
				</div>
				
				{deviceStatus === 'connected' ? (
					<div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-full font-medium text-sm animate-pulse border border-emerald-500/20 shadow-sm">
						<div className="w-2 h-2 rounded-full bg-emerald-500"></div>
						متصل به دستگاه
					</div>
				) : deviceStatus === 'disconnected' ? (
					<div className="flex items-center gap-2 bg-rose-500/10 text-rose-600 px-4 py-2 rounded-full font-medium text-sm border border-rose-500/20 shadow-sm">
						<div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
						ارتباط با دستگاه قطع است
					</div>
				) : (
					<div className="flex items-center gap-2 bg-slate-500/10 text-slate-600 px-4 py-2 rounded-full font-medium text-sm border border-slate-500/20 shadow-sm">
						<div className="w-2 h-2 rounded-full bg-slate-400"></div>
						در حال بررسی وضعیت...
					</div>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-xl border bg-card p-6 shadow-sm">
					<div className="flex items-center gap-4">
						<div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
							<Fingerprint size={24} />
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground">کل ترددهای امروز</p>
							<p className="text-3xl font-bold">{allPunches.length}</p>
						</div>
					</div>
				</div>
			</div>

			<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
				<div className="p-4 border-b bg-muted/20">
					<h2 className="font-semibold">لیست ترددها</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left">
						<thead className="bg-muted/50 text-muted-foreground text-right border-b">
							<tr>
								<th className="px-6 py-4 font-medium">دانش‌آموز</th>
								<th className="px-6 py-4 font-medium">کد ملی</th>
								<th className="px-6 py-4 font-medium">زمان ثبت</th>
								<th className="px-6 py-4 font-medium">وضعیت سیستم</th>
							</tr>
						</thead>
						<tbody className="divide-y text-right">
							{isLoading && allPunches.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
										در حال دریافت اطلاعات...
									</td>
								</tr>
							) : allPunches.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
										هیچ ترددی برای امروز ثبت نشده است.
									</td>
								</tr>
							) : (
								allPunches.map((punch) => (
									<tr key={punch.id} className="hover:bg-muted/30 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												{punch.studentName ? (
													<div className="bg-primary/10 text-primary p-2 rounded-full">
														<UserCircle size={20} />
													</div>
												) : (
													<div className="bg-amber-500/10 text-amber-500 p-2 rounded-full">
														<AlertTriangle size={20} />
													</div>
												)}
												<span className={`font-medium ${!punch.studentName ? 'text-amber-600' : ''}`}>
													{punch.studentName || 'ناشناس (یافت نشد)'}
												</span>
											</div>
										</td>
										<td className="px-6 py-4 text-muted-foreground font-mono">
											{punch.nationalCode || '---'}
										</td>
										<td className="px-6 py-4 font-medium flex items-center gap-2">
											<Clock size={16} className="text-muted-foreground" />
											<span dir="ltr">
												{format(new Date(punch.recordTime), 'HH:mm:ss')}
											</span>
										</td>
										<td className="px-6 py-4">
											{punch.studentId ? (
												<span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
													موفق
												</span>
											) : (
												<span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">
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
		</div>
	);
}
