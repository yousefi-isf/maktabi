import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "#env";
import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { platformProcedure, router, tenantProcedure } from "../../trpc/trpc.js";

const LIST_PERMISSION: PermissionCode = "identity.user.list";
const CREATE_PERMISSION: PermissionCode = "identity.user.create";
const INVITE_PERMISSION: PermissionCode = "identity.user.invite";

/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "email": "user@example.com",
 *     "fullName": "علی رضایی",
 *     "nationalCode": "0012345678",
 *     "phone": "09121234567",
 *     "schoolId": "550e8400-e29b-41d4-a716-446655440000",
 *     "roleId": "550e8400-e29b-41d4-a716-446655440001",
 *     "academicYearId": "550e8400-e29b-41d4-a716-446655440002"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const createInput = z.object({
	email: z.email(),
	fullName: z.string().trim().min(1).max(200),
	nationalCode: z.string().trim().min(1).max(32),
	phone: z.string().trim().min(1).max(32).optional(),
	schoolId: z.uuid(),
	roleId: z.uuid(),
	academicYearId: z.uuid().optional(),
});

/* -------------------------- Invite input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "userId": "550e8400-e29b-41d4-a716-446655440000",
 *     "inviteExpiredAt": "2026-08-19T12:00:00.000Z"
 *   },
 *   "meta": {
 *     "values": {
 *       "inviteExpiredAt": ["Date"]
 *     },
 *     "v": 1
 *   }
 * }
 */
const inviteInput = z.object({
	userId: z.uuid(),
	inviteExpiredAt: z.date(),
});

export const usersRouter = router({
	list: tenantProcedure.query(async ({ ctx }) => {
		if (!ctx.permissions.includes(LIST_PERMISSION)) {
			throw appError({
				code: "FORBIDDEN",
				appCode: "MISSING_PERMISSION",
				params: { permission: LIST_PERMISSION },
			});
		}
		// const users = await ctx.prisma.user.findMany({
		// 	orderBy: { fullName: "asc" },
		// 	select: {
		// 		createdAt: true,
		// 		email: true,
		// 		fullName: true,
		// 		id: true,
		// 		nationalCode: true, phone: true, image: true,
		// 	}
		// })
		const memberships = await ctx.prisma.userSchool.findMany({
			where: {
				schoolId: ctx.activeSchoolId,
				status: "active",
				deletedAt: null,
				user: { deletedAt: null },
			},
			orderBy: { user: { fullName: "asc" } },
			select: {
				joinedAt: true,
				isDefault: true,
				user: {
					select: {
						id: true,
						fullName: true,
						email: true,
						nationalCode: true,
						phone: true,
						image: true,
						emailVerified: true,
						createdAt: true,
					},
				},
				userRoles: {
					where: {
						role: {
							deletedAt: null,
							OR: [{ schoolId: ctx.activeSchoolId }, { schoolId: null }],
						},
					},
					select: {
						academicYearId: true,
						role: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});
		return memberships.map(({ user, userRoles, ...membership }) => ({
			...user,
			membership,
			roles: userRoles.map(({ role, academicYearId }) => ({
				...role,
				academicYearId,
			})),
		}));
	}),
	// list : platformProcedure.query(asy)
	create: tenantProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: CREATE_PERMISSION },
				});
			}
			if (input.schoolId !== ctx.activeSchoolId) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "USER_SCHOOL_MISMATCH",
				});
			}

			const email = input.email.trim().toLowerCase();

			const userId = await ctx.prisma.$transaction(async (tx) => {
				const role = await tx.role.findFirst({
					where: {
						id: input.roleId,
						deletedAt: null,
						OR: [{ schoolId: input.schoolId }, { schoolId: null }],
					},
					select: { id: true },
				});
				if (!role) {
					throw appError({
						code: "BAD_REQUEST",
						appCode: "INVALID_ROLE",
					});
				}

				if (input.academicYearId) {
					const academicYear = await tx.academicYear.findFirst({
						where: {
							id: input.academicYearId,
							schoolId: input.schoolId,
							deletedAt: null,
						},
						select: { id: true },
					});
					if (!academicYear) {
						throw appError({
							code: "BAD_REQUEST",
							appCode: "INVALID_ACADEMIC_YEAR",
						});
					}
				}

				const collisions = await tx.user.findMany({
					where: {
						OR: [{ email }, { nationalCode: input.nationalCode }],
					},
				});
				const existingUser = collisions.find(
					(user) =>
						user.email === email && user.nationalCode === input.nationalCode,
				);
				if (collisions.length > 0 && !existingUser) {
					throw appError({
						code: "CONFLICT",
						appCode: "USER_IDENTITY_CONFLICT",
					});
				}
				if (existingUser?.deletedAt) {
					throw appError({
						code: "CONFLICT",
						appCode: "MATCHING_USER_DELETED",
					});
				}

				const user = existingUser
					? await tx.user.update({
						where: { id: existingUser.id },
						data: {
							fullName: input.fullName,
							phone: input.phone ?? null,
						},
					})
					: await tx.user.create({
						data: {
							email,
							fullName: input.fullName,
							nationalCode: input.nationalCode,
							phone: input.phone,
						},
					});

				const activeMembershipCount = await tx.userSchool.count({
					where: { userId: user.id, status: "active", deletedAt: null },
				});
				const currentMembership = await tx.userSchool.findUnique({
					where: {
						userId_schoolId: { userId: user.id, schoolId: input.schoolId },
					},
				});

				if (currentMembership) {
					await tx.userSchool.update({
						where: { id: currentMembership.id },
						data: {
							status: "active",
							deletedAt: null,
							leftAt: null,
							...(activeMembershipCount === 0 ? { isDefault: true } : {}),
						},
					});
				} else {
					await tx.userSchool.create({
						data: {
							userId: user.id,
							schoolId: input.schoolId,
							joinedAt: new Date(),
							isDefault: activeMembershipCount === 0,
						},
					});
				}

				const existingRole = await tx.userRole.findFirst({
					where: {
						userId: user.id,
						schoolId: input.schoolId,
						roleId: input.roleId,
						academicYearId: input.academicYearId ?? null,
					},
					select: { id: true },
				});
				if (!existingRole) {
					await tx.userRole.create({
						data: {
							userId: user.id,
							schoolId: input.schoolId,
							roleId: input.roleId,
							academicYearId: input.academicYearId,
						},
					});
				}

				return user.id;
			});

			return { userId };
		}),

	invite: tenantProcedure
		.input(inviteInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(INVITE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: INVITE_PERMISSION },
				});
			}
			if (input.inviteExpiredAt.getTime() <= Date.now()) {
				throw appError({
					code: "BAD_REQUEST",
					appCode: "INVITE_EXPIRATION_INVALID",
				});
			}

			const token = randomBytes(32).toString("base64url");

			await ctx.prisma.$transaction(async (tx) => {
				const membership = await tx.userSchool.findFirst({
					where: {
						userId: input.userId,
						schoolId: ctx.activeSchoolId,
						status: "active",
						deletedAt: null,
						user: { deletedAt: null },
					},
					select: { userId: true },
				});
				if (!membership) {
					throw appError({
						code: "NOT_FOUND",
						appCode: "USER_NOT_FOUND_IN_ACTIVE_SCHOOL",
					});
				}

				const credential = await tx.authAccount.findFirst({
					where: { userId: input.userId, providerId: "credential" },
					select: { id: true },
				});
				if (credential) {
					throw appError({
						code: "CONFLICT",
						appCode: "USER_ALREADY_HAS_CREDENTIALS",
					});
				}

				await tx.authVerification.deleteMany({
					where: {
						value: input.userId,
						identifier: { startsWith: "reset-password:" },
					},
				});

				await tx.authVerification.create({
					data: {
						id: randomUUID(),
						identifier: `reset-password:${token}`,
						value: input.userId,
						expiresAt: input.inviteExpiredAt,
					},
				});
			});

			const inviteUrl = new URL("/set-password", env.CLIENT_ORIGIN);
			inviteUrl.searchParams.set("token", token);
			return {
				status: "invited" as const,
				userId: input.userId,
				inviteUrl: inviteUrl.toString(),
			};
		}),
});
