import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	staticData: {
		breadcrumb: "خانه",
	},
	beforeLoad: async ({ context }) => {
		try {
			await context.trpcClient.auth.me.query();
		} catch {
			throw redirect({ to: "/login" });
		}
	},
	component: HomePage,
});
// function AppLayout() {
// 	return (
// 		<SidebarProvider>
// 			<AppSidebar />
// 			<SidebarInset>
// 				<Header />
// 				<OutletContainer>
// 					<Outlet />
// 				</OutletContainer>
// 			</SidebarInset>
// 		</SidebarProvider>
// 	);
// }
function HomePage() {
	return <div>صفحه اصلی</div>;
}
