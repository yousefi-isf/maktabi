import { Prisma, type PrismaClient } from "@maktabi/db";
import { z } from "zod";
import { paginatePrisma, searchInput } from "../../lib/pagination.js";
import { appError } from "../../trpc/app-error.js";
import { router, superAdminProcedure } from "../../trpc/trpc.js";

const schoolSelect = {
	id: true,
	name: true,
	district: true,
	city: true,
	province: true,
	schoolType: true,
	address: true,
	phone: true,
} as const;

/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "name": "دبیرستان نمونه",
 *     "district": "منطقه 1",
 *     "city": "تهران",
 *     "province": "تهران",
 *     "schoolType": "high_school",
 *     "address": "خیابان نمونه",
 *     "phone": "02112345678"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const createInput = z.object({
	name: z.string().trim().min(1).max(200),
	district: z.string().trim().min(1).max(100),
	city: z.string().trim().min(1).max(100),
	province: z.string().trim().min(1).max(100),
	schoolType: z.enum(["middle_school", "high_school", "technical"]),
	address: z.string().trim().max(500).optional(),
	phone: z.string().trim().max(32).optional(),
});

/* -------------------------- Update input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "name": "دبیرستان نمونه",
 *     "district": "منطقه 1",
 *     "city": "تهران",
 *     "province": "تهران",
 *     "schoolType": "high_school",
 *     "address": "خیابان نمونه",
 *     "phone": "02112345678"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const updateInput = z.object({
	id: z.uuid(),
	name: z.string().trim().min(1).max(200).optional(),
	district: z.string().trim().min(1).max(100).optional(),
	city: z.string().trim().min(1).max(100).optional(),
	province: z.string().trim().min(1).max(100).optional(),
	schoolType: z.enum(["middle_school", "high_school", "technical"]).optional(),
	// null clears the field; undefined leaves it unchanged
	address: z.string().trim().max(500).nullish(),
	phone: z.string().trim().max(32).nullish(),
});

/* -------------------------- Delete input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const deleteInput = z.object({
	id: z.uuid(),
});

/* --------------------- List schools input (JSON): --------------------- */
/**
 * {
 *   "json": {
 *     "page": 1,
 *     "limit": 20,
 *     "q": "دبیرستان"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 */
const listSchoolsInput = searchInput;

type UniqueSchoolFields = {
	name?: string;
	address?: string | null;
	phone?: string | null;
};

// School has no DB unique constraints — name/address/phone uniqueness is
// enforced here, in the service layer.
async function assertUniqueSchoolFields(
	db: Pick<PrismaClient, "school">,
	fields: UniqueSchoolFields,
	excludeSchoolId?: string,
) {
	const exclude = excludeSchoolId ? { id: { not: excludeSchoolId } } : {};

	if (fields.name) {
		const existingName = await db.school.findFirst({
			where: { name: fields.name, deletedAt: null, ...exclude },
			select: { id: true },
		});
		if (existingName) {
			throw appError({
				code: "CONFLICT",
				appCode: "SCHOOL_NAME_EXISTS",
				params: { name: fields.name },
			});
		}
	}

	if (fields.address) {
		const existingAddress = await db.school.findFirst({
			where: { address: fields.address, deletedAt: null, ...exclude },
			select: { id: true },
		});
		if (existingAddress) {
			throw appError({
				code: "CONFLICT",
				appCode: "SCHOOL_ADDRESS_EXISTS",
				params: { address: fields.address },
			});
		}
	}

	if (fields.phone) {
		const existingPhone = await db.school.findFirst({
			where: { phone: fields.phone, deletedAt: null, ...exclude },
			select: { id: true },
		});
		if (existingPhone) {
			throw appError({
				code: "CONFLICT",
				appCode: "SCHOOL_PHONE_EXISTS",
				params: { phone: fields.phone },
			});
		}
	}
}

export const schoolsRouter = router({
	create: superAdminProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			await assertUniqueSchoolFields(ctx.prisma, input);

			return ctx.prisma.school.create({
				data: {
					name: input.name,
					district: input.district,
					city: input.city,
					province: input.province,
					schoolType: input.schoolType,
					address: input.address || null,
					phone: input.phone || null,
				},
				select: schoolSelect,
			});
		}),

	list: superAdminProcedure.input(listSchoolsInput).query(({ ctx, input }) => {
		const { q, ...pagination } = input;

		return paginatePrisma(
			ctx.prisma.school,
			pagination,
			{
				where: { deletedAt: null },
				select: schoolSelect,
				// All string columns — schoolType is an enum and can't do `contains`.
				search: {
					q,
					fields: ["name", "district", "city", "province", "address", "phone"],
				},
			},
			(school) => ({
				...school,
				isActive: school.id === ctx.session.activeSchoolId,
			}),
		);
	}),

	update: superAdminProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const school = await ctx.prisma.school.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true },
			});
			if (!school) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "SCHOOL_NOT_FOUND",
				});
			}

			await assertUniqueSchoolFields(ctx.prisma, input, input.id);

			try {
				return await ctx.prisma.school.update({
					where: { id: input.id },
					data: {
						...(input.name !== undefined ? { name: input.name } : {}),
						...(input.district !== undefined
							? { district: input.district }
							: {}),
						...(input.city !== undefined ? { city: input.city } : {}),
						...(input.province !== undefined
							? { province: input.province }
							: {}),
						...(input.schoolType !== undefined
							? { schoolType: input.schoolType }
							: {}),
						...(input.address !== undefined ? { address: input.address } : {}),
						...(input.phone !== undefined ? { phone: input.phone } : {}),
					},
					select: schoolSelect,
				});
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2025"
				) {
					throw appError({
						code: "NOT_FOUND",
						appCode: "SCHOOL_NOT_FOUND",
					});
				}

				throw error;
			}
		}),

	delete: superAdminProcedure
		.input(deleteInput)
		.mutation(async ({ ctx, input }) => {
			const school = await ctx.prisma.school.findFirst({
				where: { id: input.id, deletedAt: null },
				select: {
					id: true,
					_count: {
						select: {
							academicYears: { where: { deletedAt: null } },
							userSchools: { where: { deletedAt: null } },
						},
					},
				},
			});
			if (!school) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "SCHOOL_NOT_FOUND",
				});
			}

			const hasRelatedRecords = Object.values(school._count).some(
				(count) => count > 0,
			);
			if (hasRelatedRecords) {
				throw appError({
					code: "CONFLICT",
					appCode: "SCHOOL_IN_USE",
				});
			}

			try {
				await ctx.prisma.school.update({
					where: { id: school.id },
					data: { deletedAt: new Date() },
				});
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2025"
				) {
					throw appError({
						code: "NOT_FOUND",
						appCode: "SCHOOL_NOT_FOUND",
					});
				}

				throw error;
			}

			// If the deleted school was the active context, drop it from the session.
			if (ctx.session.activeSchoolId === school.id) {
				await ctx.prisma.authSession.updateMany({
					where: { id: ctx.session.id, userId: ctx.user.id },
					data: { activeSchoolId: null },
				});
			}

			return { id: school.id };
		}),
});
