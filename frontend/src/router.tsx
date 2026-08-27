import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../backend/src/trpc/router.js";
import { TRPCProvider } from "./lib/trpc";
import { showTRPCErrorToast } from "./lib/show-error-toast";
import { routeTree } from "./routeTree.gen";
import superjson from 'superjson';


const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Forward the browser's session cookie to the backend during SSR.
// (credentials: "include" alone does nothing in a server-side fetch.)
const getRequestCookieHeader = createIsomorphicFn()
	.client(() => undefined)
	.server(() => {
		try {
			return getRequestHeader("cookie");
		} catch {
			// Outside of a request context (e.g. prerendering)
			return undefined;
		}
	});

export function getRouter() {
	// A new instance is created for every SSR request.
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
		mutationCache: new MutationCache({
			onError: (error, _variables, _context, mutation) => {
				if (mutation.options.meta?.silentToast) return;
				showTRPCErrorToast(error);
			},
		}),
	});

	const cookieHeader = getRequestCookieHeader();

	const trpcClient = createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `${apiBaseUrl}/trpc`,
				transformer: superjson,
				fetch(url, options) {
					const headers = new Headers(options?.headers);
					if (cookieHeader) headers.set("cookie", cookieHeader);
					return fetch(url, {
						...options,
						credentials: 'include',
						headers,
					});
				},
			}),
		],
	});

	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		context: { trpcClient, queryClient },
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>
				<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
					{children}
				</TRPCProvider>
			</QueryClientProvider>
		),
		defaultViewTransition: true,
		// defaultPendingComponent: () => <div>لطفاً صبر کنید...</div>,
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

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			silentToast?: boolean;
		};
	}
}
