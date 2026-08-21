import { Prisma } from "@maktabi/db";
import { z } from "zod";
import { PERMISSIONS, type PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";

const CREATE_ROLE_PERMISSION: PermissionCode = "identity.role.create";
const LIST_ROLES_PERMISSION: PermissionCode = "identity.role.list";

/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "name": "معاون آموزشی",
 *     "description": "دسترسی‌های معاون آموزشی مدرسه",
 *     "permissionIds": [
 *       "550e8400-e29b-41d4-a716-446655440000",
 *       "550e8400-e29b-41d4-a716-446655440001"
 *     ]
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const createInput = z.object({
	name: z.string().trim().min(1).max(100),
	description: z.string().trim().max(500).optional(),
	permissionIds: z
		.array(z.uuid())
		.max(100)
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "شناسه دسترسی‌ها نباید تکراری باشد",
		}),
});

export const rolesRouter = router({
	create: tenantProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_ROLE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: CREATE_ROLE_PERMISSION },
				});
			}

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const existingRole = await tx.role.findFirst({
						where: {
							schoolId: ctx.activeSchoolId,
							name: input.name,
							deletedAt: null,
						},
						select: { id: true },
					});
					if (existingRole) {
						throw appError({
							code: "CONFLICT",
							appCode: "ROLE_NAME_EXISTS",
							params: { name: input.name },
						});
					}

					const grantablePermissionCodes = ctx.permissions.filter(
						(code) => code !== PERMISSIONS.SYSTEM.FULL_ACCESS,
					);
					const permissions = await tx.permission.findMany({
						where: {
							id: { in: input.permissionIds },
							code: { in: grantablePermissionCodes },
							deletedAt: null,
						},
						select: { id: true },
					});
					if (permissions.length !== input.permissionIds.length) {
						throw appError({
							code: "BAD_REQUEST",
							appCode: "INVALID_ROLE_PERMISSIONS",
						});
					}

					const role = await tx.role.create({
						data: {
							schoolId: ctx.activeSchoolId,
							name: input.name,
							description: input.description || null,
							isSystem: false,
							rolePermissions: {
								create: input.permissionIds.map((permissionId) => ({
									permission: { connect: { id: permissionId } },
								})),
							},
						},
						select: {
							id: true,
							name: true,
							description: true,
							isSystem: true,
							schoolId: true,
							rolePermissions: {
								orderBy: { permission: { code: "asc" } },
								select: {
									permission: {
										select: { id: true, code: true, description: true },
									},
								},
							},
						},
					});

					const { rolePermissions, ...createdRole } = role;
					return {
						...createdRole,
						permissions: rolePermissions.map(({ permission }) => permission),
					};
				});
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2002"
				) {
					throw appError({
						code: "CONFLICT",
						appCode: "ROLE_NAME_EXISTS",
						params: { name: input.name },
					});
				}

				throw error;
			}
		}),

	list: tenantProcedure.query(async ({ ctx }) => {
		if (!ctx.permissions.includes(LIST_ROLES_PERMISSION)) {
			throw appError({
				code: "FORBIDDEN",
				appCode: "MISSING_PERMISSION",
				params: { permission: LIST_ROLES_PERMISSION },
			});
		}

		return ctx.prisma.role.findMany({
			where: {
				deletedAt: null,
				OR: [{ schoolId: ctx.activeSchoolId }, { schoolId: null }],
			},
			orderBy: [{ isSystem: "desc" }, { name: "asc" }],
			select: {
				id: true,
				name: true,
				description: true,
				isSystem: true,
				schoolId: true,
			},
		});
	}),
});
