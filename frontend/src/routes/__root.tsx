import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { AppSidebar } from "#/components/app-sidebar";
import Header from "#/components/header.tsx";
import OutletContainer from "#/components/outlet-container.tsx";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { DIR, LANG } from "#/lib/locale.ts";
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
	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang={LANG} dir={DIR} suppressHydrationWarning>
			<head>
				{/* <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /> */}
				<HeadContent />
			</head>
			<body>
				{/* <DirectionProvider direction={DIR}> */}
				<ThemeProvider defaultTheme="system" storageKey="theme">
					{/* ―――――――――――――――――――――――――――― Panel + Dashboard ――――――――――――――――――――――――――― */}
					<SidebarProvider>
						<AppSidebar />
						<SidebarInset>
							<Header />
							<OutletContainer>
								<Outlet />
							</OutletContainer>
						</SidebarInset>
					</SidebarProvider>

					{/* ―――――――――――――――――――――――――――――――― DevTools ―――――――――――――――――――――――――――――――― */}
					{/* <TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/> */}
				</ThemeProvider>
				{/* </DirectionProvider> */}
				<Scripts />
			</body>
		</html>
	);
}
