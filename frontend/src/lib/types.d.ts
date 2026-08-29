import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../backend/src/trpc/router";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export interface PaginatedResponse<T> {
	data: T[];
	meta: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
	links: {
		self: string;
		next?: string;
		prev?: string;
	};
}
