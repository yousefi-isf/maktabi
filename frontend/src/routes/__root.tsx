import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import type { TRPCClient } from "@trpc/client";
import type { ReactNode } from "react";
import { NotFoundPage } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip.js";
import { DIR, LANG } from "@/lib/locale";
import type { AppRouter } from "../../../backend/src/trpc/router.js";
import appCss from "../styles.css?url";

export interface RouterContext {
	trpcClient: TRPCClient<AppRouter>;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
	notFoundComponent: NotFoundPage,

});
function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang={LANG} dir={DIR} suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider defaultTheme="system" storageKey="theme">
					<TooltipProvider>
						{children}
					</TooltipProvider>
					<Toaster />
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
