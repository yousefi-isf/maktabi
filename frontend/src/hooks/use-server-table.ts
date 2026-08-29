import {
	keepPreviousData,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { PaginatedResponse } from "@/lib/types";

interface PaginationState {
	pageIndex: number;
	pageSize: number;
}

interface ServerTableOptions<TData, TFilters extends Record<string, unknown>> {
	filters: TFilters;
	queryOptions: (
		params: TFilters & { page: number; limit: number },
		// Loose generics so tRPC's queryOptions() output (custom error/queryKey
		// types) is assignable while query.data stays typed as PaginatedResponse.
	) => UseQueryOptions<
		PaginatedResponse<TData>,
		any,
		PaginatedResponse<TData>,
		any
	>;
	initialPageSize?: number;
}

export function useServerTable<
	TData,
	TFilters extends Record<string, unknown>,
>({
	filters,
	queryOptions,
	initialPageSize = 19,
}: ServerTableOptions<TData, TFilters>) {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: initialPageSize,
	});

	const filtersKey = JSON.stringify(filters);
	const prevFiltersKey = useRef(filtersKey);

	useEffect(() => {
		if (prevFiltersKey.current !== filtersKey) {
			prevFiltersKey.current = filtersKey;
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		}
	}, [filtersKey]);

	const query = useQuery({
		...queryOptions({
			...filters,
			page: pagination.pageIndex + 1,
			limit: pagination.pageSize,
		}),
		placeholderData: keepPreviousData,
	});

	const meta = query.data?.meta;

	return {
		data: query.data?.data ?? [],
		meta: {
			totalItems: meta?.totalItems ?? 0,
			totalPages: meta?.totalPages ?? 0,
			hasNextPage: meta?.hasNextPage ?? false,
			hasPrevPage: meta?.hasPrevPage ?? false,
		},
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		pagination,
		onPaginationChange: setPagination,
	};
}
