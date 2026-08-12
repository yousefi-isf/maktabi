import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../backend/src/trpc/router.js";
import { TRPCProvider } from "./lib/trpc";
import { routeTree } from "./routeTree.gen";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function getRouter() {
	// A new instance is created for every SSR request.
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});

	const trpcClient = createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `${apiBaseUrl}/trpc`,
			}),
		],
	});

	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>
				<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
					{children}
				</TRPCProvider>
			</QueryClientProvider>
		),
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
		wrapQueryClient: false,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}

	interface StaticDataRouteOption {
		breadcrumb?: string;
	}
}
