import { Prisma } from "@maktabi/db";
import { z } from "zod";

/* -------------------------- List input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "page": 2,
 *     "limit": 20
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 */
export const listInput = z.object({
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

export type ListInput = z.infer<typeof listInput>;

/* ---------------------- Searchable list input (JSON): ---------------------- */
/**
 * {
 *   "json": {
 *     "page": 1,
 *     "limit": 20,
 *     "q": "search term"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 */
export const searchInput = listInput.extend({
	// Free-text search across the fields the endpoint declares searchable.
	q: z.string().trim().max(200).optional(),
});

export type SearchInput = z.infer<typeof searchInput>;

// Extra query params (e.g. search/filter values) that are preserved in the
// pagination links so "next"/"prev" keep the same result set.
export type LinkQueryParams = Record<string, string | number | undefined>;

export type PaginationMeta = {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
};

export type PaginationLinks = {
	self: string;
	next?: string;
	prev?: string;
};

export type PaginatedResult<T> = {
	data: T[];
	meta: PaginationMeta;
	links: PaginationLinks;
};

function buildLink(
	page: number,
	limit: number,
	extra?: LinkQueryParams,
): string {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (extra) {
		for (const [key, value] of Object.entries(extra)) {
			if (value !== undefined && value !== "") params.set(key, String(value));
		}
	}
	return `?${params.toString()}`;
}

export async function paginate<T>(
	input: ListInput,
	count: () => Promise<number>,
	findMany: (skip: number, take: number) => Promise<T[]>,
	extraQuery?: LinkQueryParams,
): Promise<PaginatedResult<T>> {
	const { page, limit } = input;
	const skip = (page - 1) * limit;

	// COUNT and SELECT run in parallel — no need to await them sequentially.
	const [totalItems, data] = await Promise.all([
		count(),
		findMany(skip, limit),
	]);

	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	return {
		data,
		meta: {
			page,
			limit,
			totalItems,
			totalPages,
			hasNextPage,
			hasPrevPage,
		},
		links: {
			self: buildLink(page, limit, extraQuery),
			...(hasNextPage ? { next: buildLink(page + 1, limit, extraQuery) } : {}),
			...(hasPrevPage ? { prev: buildLink(page - 1, limit, extraQuery) } : {}),
		},
	};
}

// Minimal structural shape of a Prisma model delegate, so `where` is
// type-checked against the actual model's WhereInput.
type PaginatableModel<W, R> = {
	count(args?: { where?: W }): Promise<number>;
	findMany(args?: {
		where?: W;
		orderBy?: unknown;
		select?: unknown;
		skip?: number;
		take?: number;
	}): Promise<R[]>;
};

export type PaginationArgs<W> = {
	where?: W;
	orderBy?: unknown;
	select?: unknown;
	query?: LinkQueryParams;
	// Free-text search: case-insensitive `contains` OR-ed across the given
	// model fields (string columns only — enums don't support `contains`).
	search?: {
		q?: string;
		fields: (keyof W & string)[];
	};
};

// Offset pagination over a Prisma model. COUNT and findMany share `where`,
// ordering defaults to the `id` index, and `transform` maps each row
// (e.g. attaching computed flags) before returning the envelope.
// `search.q` is folded into `where` and preserved in the pagination links,
// so filtered navigation keeps its context across pages.
//
// Note: `select` narrows the rows at runtime, but `R` stays the full model
// row type — pass an explicit type param when exact narrowing is needed.
export async function paginatePrisma<W, R>(
	model: PaginatableModel<W, R>,
	input: ListInput,
	args?: PaginationArgs<W>,
): Promise<PaginatedResult<R>>;
export async function paginatePrisma<W, R, T>(
	model: PaginatableModel<W, R>,
	input: ListInput,
	args: PaginationArgs<W>,
	transform: (item: R) => T,
): Promise<PaginatedResult<T>>;
export async function paginatePrisma<W, R, T = R>(
	model: PaginatableModel<W, R>,
	input: ListInput,
	args: PaginationArgs<W> = {},
	transform?: (item: R) => T,
): Promise<PaginatedResult<R | T>> {
	const { where, orderBy, select, query, search } = args;

	const searchFilter =
		search?.q && search.fields.length > 0
			? ({
				OR: search.fields.map((field) => ({
					[field]: {
						contains: search.q,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			} as W)
			: undefined;

	// AND-merge so a caller-provided `where.OR` is never clobbered.
	const combinedWhere =
		searchFilter && where
			? ({ AND: [where, searchFilter] } as W)
			: (where ?? searchFilter);

	const linksQuery = {
		...query,
		...(search?.q ? { q: search.q } : {}),
	};

	const result = await paginate(
		input,
		() => model.count({ where: combinedWhere }),
		(skip, take) =>
			model.findMany({
				where: combinedWhere,
				orderBy: orderBy ?? { id: "asc" },
				select,
				skip,
				take,
			}),
		linksQuery,
	);

	return {
		...result,
		data: transform ? result.data.map(transform) : result.data,
	};
}
