import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasPermission } from "@/lib/permissions";
import { DASHBOARD_REQUIREMENT } from "@/lib/dashboard-access";
import { AttendanceSummaryCard } from "@/features/dashboard/AttendanceSummaryCard";
import { LivePunchesCard } from "@/features/dashboard/LivePunchesCard";
import { StudentRankingsView } from "@/features/rankings";

export const Route = createFileRoute("/_authenticated/")({
	beforeLoad: ({ context }) => {
		if (!hasPermission(context.me.permissions, DASHBOARD_REQUIREMENT)) {
			throw redirect({
				to: hasPermission(context.me.permissions, {
					anyOf: ["attendance.record.create", "attendance.record.update"],
				})
					? "/attendance/classroom"
					: "/account",
			});
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex flex-col gap-8 p-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">پیشخوان</h1>
				<p className="text-muted-foreground mt-1">خلاصه وضعیت مدرسه</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<AttendanceSummaryCard />
				<LivePunchesCard />
			</div>

			<div className="pt-2 border-t">
				<StudentRankingsView />
			</div>
		</div>
	);
}
