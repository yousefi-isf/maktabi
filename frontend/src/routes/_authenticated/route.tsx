import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import OutletContainer from "@/components/outlet-container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/components/Header";

export const Route = createFileRoute("/_authenticated")({
	staticData: {
		breadcrumb: "خانه",
	},
	beforeLoad: async ({ context }) => {
		try {
			const me = await context.trpcClient.auth.me.query();
			return { me };
		} catch {
			throw redirect({ to: "/login" });
		}
	},
	component: AppLayout

});
function AppLayout() {
	const { me } = Route.useRouteContext();
	return (
		<SidebarProvider>
			<AppSidebar me={me} />
			<SidebarInset>
				<Header />
				<OutletContainer>
					<Outlet />
				</OutletContainer>
			</SidebarInset>
		</SidebarProvider>
	);
}
