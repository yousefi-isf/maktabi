import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import Header from "@/components/header";
import { NotFoundPage } from "@/components/not-found";
import OutletContainer from "@/components/outlet-container";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DIR, LANG } from "@/lib/locale";
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
				title: "Maktabi | مکتبی",
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
	component: AppLayout,
	notFoundComponent: NotFoundPage,
});
function AppLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<Header />
				<OutletContainer>
					<Outlet />
				</OutletContainer>
			</SidebarInset>
		</SidebarProvider>
	);
}
function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang={LANG} dir={DIR} suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider defaultTheme="system" storageKey="theme">
					{children}
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
