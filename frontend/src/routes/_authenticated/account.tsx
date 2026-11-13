import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account")({
	component: AccountPage,
});

function AccountPage() {
	const { me } = Route.useRouteContext();
	return (
		<div className="space-y-3 p-6" dir="rtl">
			<h1 className="text-2xl font-bold">حساب من</h1>
			<div className="max-w-xl space-y-3 rounded-xl border bg-card p-5">
				<p className="font-medium">{me.user.name}</p>
				<p className="text-sm text-muted-foreground">
					{me.currentSchool?.name}
				</p>
				<p className="text-sm text-muted-foreground">
					بخش‌های در دسترس شما در منوی سامانه نمایش داده می‌شوند.
				</p>
			</div>
		</div>
	);
}
