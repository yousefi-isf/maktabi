import { DirectionProvider, Separator } from "@base-ui/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppSidebar } from "#/components/app-sidebar";
import Header from "#/components/Header";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import appCss from "../styles.css?url";
export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /> */}
				<HeadContent />
			</head>
			<body>
				<DirectionProvider direction="rtl">
					<ThemeProvider defaultTheme="system" storageKey="theme">
						{/* ―――――――――――――――――――――――――――― Panel + Dashboard ――――――――――――――――――――――――――― */}
						<SidebarProvider>
							<AppSidebar />
							<SidebarInset>
								<Header />
								<Outlet />
							</SidebarInset>
						</SidebarProvider>

						{/* ―――――――――――――――――――――――――――――――― DevTools ―――――――――――――――――――――――――――――――― */}
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					</ThemeProvider>
				</DirectionProvider>
				<Scripts />
			</body>
		</html>
	);
}
