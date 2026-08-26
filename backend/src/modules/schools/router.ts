import { z } from "zod";
import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { platformProcedure, router } from "../../trpc/trpc.js";

const LIST_PERMISSION: PermissionCode = "identity.school.list";
const CREATE_PERMISSION: PermissionCode = "identity.school.create";

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

export const schoolsRouter = router({
	create: platformProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: CREATE_PERMISSION },
				});
			}

			const existingName = await ctx.prisma.school.findFirst({
				where: { name: input.name, deletedAt: null },
				select: { id: true },
			});
			if (existingName) {
				throw appError({
					code: "CONFLICT",
					appCode: "SCHOOL_NAME_EXISTS",
					params: { name: input.name },
				});
			}

			if (input.address) {
				const existingAddress = await ctx.prisma.school.findFirst({
					where: { address: input.address, deletedAt: null },
					select: { id: true },
				});
				if (existingAddress) {
					throw appError({
						code: "CONFLICT",
						appCode: "SCHOOL_ADDRESS_EXISTS",
						params: { address: input.address },
					});
				}
			}

			if (input.phone) {
				const existingPhone = await ctx.prisma.school.findFirst({
					where: { phone: input.phone, deletedAt: null },
					select: { id: true },
				});
				if (existingPhone) {
					throw appError({
						code: "CONFLICT",
						appCode: "SCHOOL_PHONE_EXISTS",
						params: { phone: input.phone },
					});
				}
			}

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
				select: {
					id: true,
					name: true,
					district: true,
					city: true,
					province: true,
					schoolType: true,
					address: true,
					phone: true,
				},
			});
		}),

	list: platformProcedure.query(async ({ ctx }) => {
		if (!ctx.permissions.includes(LIST_PERMISSION)) {
			throw appError({
				code: "FORBIDDEN",
				appCode: "MISSING_PERMISSION",
				params: { permission: LIST_PERMISSION },
			});
		}

		const schools = await ctx.prisma.school.findMany({
			where: { deletedAt: null },
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				district: true,
				city: true,
				province: true,
				schoolType: true,
				address: true,
				phone: true,
			},
		});

		return schools.map((school) => ({
			...school,
			isActive: school.id === ctx.session.activeSchoolId,
		}));
	}),
});
