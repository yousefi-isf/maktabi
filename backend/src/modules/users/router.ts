import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@maktabi/db";
import { env } from "#env";
import type { PermissionCode } from "../../config/permissions.js";
import { paginate, paginatePrisma, searchInput } from "../../lib/pagination.js";
import { appError } from "../../trpc/app-error.js";
import {
	router,
	superAdminProcedure,
	tenantProcedure,
} from "../../trpc/trpc.js";

const LIST_PERMISSION: PermissionCode = "identity.user.list";
const CREATE_PERMISSION: PermissionCode = "identity.user.create";
const INVITE_PERMISSION: PermissionCode = "identity.user.invite";
const DELETE_PERMISSION: PermissionCode = "identity.user.delete";

/* ---------------------- List users input (JSON): ---------------------- */
/**
 * {
 *   "json": {
 *     "page": 1,
 *     "limit": 20,
 *     "q": "علی"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const listUsersInput = searchInput;

/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "email": "user@example.com",
 *     "fullName": "علی رضایی",
 *     "nationalCode": "0012345678",
 *     "phone": "09121234567",
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
	inviteExpiredAt: z.date().optional().default(() => {
		const date = new Date();
		date.setDate(date.getDate() + 2);
		return date;
	}),
});

/* -------------------------- Delete input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000" // or an array of UUIDs
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const deleteInput = z.object({
	id: z.union([z.uuid(), z.array(z.uuid()).min(1)]),
});

/* ------------------------- Get by ID input (JSON): ------------------------ */
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
const getByIdInput = z.object({
	id: z.uuid(),
});

export const usersRouter = router({
	list: tenantProcedure.input(listUsersInput).query(async ({ ctx, input }) => {
		if (!ctx.permissions.includes(LIST_PERMISSION)) {
			throw appError({
				code: "FORBIDDEN",
				appCode: "MISSING_PERMISSION",
				params: { permission: LIST_PERMISSION },
			});
		}

		const { q, ...pagination } = input;

		const where: Prisma.UserSchoolWhereInput = {
			schoolId: ctx.activeSchoolId,
			status: "active",
			deletedAt: null,
			user: {
				deletedAt: null,
				...(q
					? {
						OR: [
							{ fullName: { contains: q, mode: Prisma.QueryMode.insensitive } },
							{ email: { contains: q, mode: Prisma.QueryMode.insensitive } },
							{ nationalCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
							{ phone: { contains: q, mode: Prisma.QueryMode.insensitive } },
						],
					}
					: {}),
			},
		};

		const result = await paginate(
			pagination,
			() => ctx.prisma.userSchool.count({ where }),
			(skip, take) =>
				ctx.prisma.userSchool.findMany({
					where,
					orderBy: { user: { fullName: "asc" } },
					skip,
					take,
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
				}),
			q ? { q } : undefined,
		);

		return {
			...result,
			data: result.data.map(({ user, userRoles, ...membership }) => ({
				...user,
				membership,
				roles: userRoles.map(({ role, academicYearId }) => ({
					...role,
					academicYearId,
				})),
			})),
		};
	}),

	getById: tenantProcedure.input(getByIdInput).query(async ({ ctx, input }) => {
		if (!ctx.permissions.includes(LIST_PERMISSION)) {
			throw appError({
				code: "FORBIDDEN",
				appCode: "MISSING_PERMISSION",
				params: { permission: LIST_PERMISSION },
			});
		}
		const membership = await ctx.prisma.userSchool.findFirst({
			where: {
				userId: input.id,
				schoolId: ctx.activeSchoolId,
				status: "active",
				deletedAt: null,
				user: { deletedAt: null },
			},
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

		if (!membership) {
			throw appError({
				code: "NOT_FOUND",
				appCode: "USER_NOT_FOUND_IN_ACTIVE_SCHOOL",
			});
		}

		const { user, userRoles, ...membershipData } = membership;

		return {
			...user,
			membership: membershipData,
			roles: userRoles.map(({ role, academicYearId }) => ({
				...role,
				academicYearId,
			})),
			academicYearId: userRoles[0]?.academicYearId ?? null,
		};
	}),

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

			const email = input.email.trim().toLowerCase();

			const userId = await ctx.prisma.$transaction(async (tx) => {
				const role = await tx.role.findFirst({
					where: {
						id: input.roleId,
						deletedAt: null,
						OR: [{ schoolId: ctx.activeSchoolId }, { schoolId: null }],
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
							schoolId: ctx.activeSchoolId,
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
						userId_schoolId: { userId: user.id, schoolId: ctx.activeSchoolId },
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
							schoolId: ctx.activeSchoolId,
							joinedAt: new Date(),
							isDefault: activeMembershipCount === 0,
						},
					});
				}

				const existingRole = await tx.userRole.findFirst({
					where: {
						userId: user.id,
						schoolId: ctx.activeSchoolId,
						roleId: input.roleId,
						academicYearId: input.academicYearId ?? null,
					},
					select: { id: true },
				});
				if (!existingRole) {
					await tx.userRole.create({
						data: {
							userId: user.id,
							schoolId: ctx.activeSchoolId,
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

			const user = await ctx.prisma.user.findFirst({
				where: {
					id: input.userId,
				}
				,
				select: {
					id: true,
					fullName: true,
				}
			})

			return {
				status: "invited" as const,
				user,
				inviteUrl: inviteUrl.toString(),
			};
		}),

	// platform-wide: all users across all schools (super admin only)
	listAll: superAdminProcedure
		.input(searchInput)
		.query(async ({ ctx, input }) => {
			const { q, ...pagination } = input;

			const select = {
				id: true,
				fullName: true,
				email: true,
				nationalCode: true,
				phone: true,
				image: true,
				emailVerified: true,
				isSuperAdmin: true,
				createdAt: true,
				updatedAt: true,
				userSchools: {
					where: {
						status: "active" as const,
						deletedAt: null,
						school: { deletedAt: null },
					},
					select: {
						isDefault: true,
						school: { select: { id: true, name: true } },
					},
				},

			};

			type ListAllPayload = Prisma.UserGetPayload<{ select: typeof select }>;

			return paginatePrisma(
				ctx.prisma.user,
				pagination,
				{
					where: { deletedAt: null },
					orderBy: { fullName: "asc" },
					select,
					search: {
						q,
						fields: ["fullName", "email", "nationalCode", "phone"],
					},
				},
				(userRow) => {
					const { userSchools, ...user } = userRow as unknown as ListAllPayload;
					return {
						...user,
						schools: userSchools.map(({ school, isDefault }) => ({
							...school,
							isDefault,
						})),
					};
				},
			);
		}),

	delete: tenantProcedure
		.input(deleteInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(DELETE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: DELETE_PERMISSION },
				});
			}

			const ids = Array.isArray(input.id) ? input.id : [input.id];

			if (ctx.user.isSuperAdmin && ids.includes(ctx.user.id)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "CANNOT_DELETE_SELF",
				});
			}

			const memberships = await ctx.prisma.userSchool.findMany({
				where: {
					userId: { in: ids },
					schoolId: ctx.activeSchoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					userId: true,
					teachers: {
						select: {
							_count: {
								select: {
									teachingAssignments: { where: { deletedAt: null } },
								},
							},
						},
					},
					students: {
						select: {
							_count: {
								select: {
									enrollments: {
										where: { deletedAt: null, status: "active" },
									},
								},
							},
						},
					},
				},
			});

			if (memberships.length === 0) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "USER_NOT_FOUND_IN_ACTIVE_SCHOOL",
				});
			}

			// Check blockers within this school
			for (const ms of memberships) {
				const hasActiveClasses = ms.teachers.some(
					(t) => t._count.teachingAssignments > 0,
				);
				const hasActiveEnrollments = ms.students.some(
					(s) => s._count.enrollments > 0,
				);

				if (hasActiveClasses || hasActiveEnrollments) {
					throw appError({
						code: "CONFLICT",
						appCode: "USER_IN_USE",
					});
				}
			}

			const deletedAt = new Date();
			const targetUserIds = memberships.map((m) => m.userId);

			await ctx.prisma.$transaction(async (tx) => {
				await tx.userSchool.updateMany({
					where: {
						userId: { in: targetUserIds },
						schoolId: ctx.activeSchoolId,
						deletedAt: null,
					},
					data: {
						deletedAt,
						status: "left",
						leftAt: deletedAt,
						isDefault: false,
					},
				});

				await tx.authSession.updateMany({
					where: {
						userId: { in: targetUserIds },
						activeSchoolId: ctx.activeSchoolId,
					},
					data: {
						activeSchoolId: null,
					},
				});
			});

			return { ids: targetUserIds };
		}),

	// platform-wide: hard/soft delete users entirely from the system (super admin only)
	deleteGlobal: superAdminProcedure
		.input(deleteInput)
		.mutation(async ({ ctx, input }) => {
			const ids = Array.isArray(input.id) ? input.id : [input.id];

			if (ids.includes(ctx.user.id)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "CANNOT_DELETE_SELF",
				});
			}

			const users = await ctx.prisma.user.findMany({
				where: { id: { in: ids }, deletedAt: null },
				select: {
					id: true,
					email: true,
					nationalCode: true,
					userSchools: {
						where: { deletedAt: null },
						select: {
							id: true,
							teachers: {
								select: {
									_count: {
										select: {
											teachingAssignments: { where: { deletedAt: null } },
										},
									},
								},
							},
							students: {
								select: {
									_count: {
										select: {
											enrollments: {
												where: { deletedAt: null, status: "active" },
											},
										},
									},
								},
							},
						},
					},
				},
			});

			if (users.length === 0) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "USER_NOT_FOUND",
				});
			}

			// Check blockers
			for (const user of users) {
				for (const us of user.userSchools) {
					const hasActiveClasses = us.teachers.some((t) => t._count.teachingAssignments > 0);
					const hasActiveEnrollments = us.students.some((s) => s._count.enrollments > 0);

					if (hasActiveClasses || hasActiveEnrollments) {
						throw appError({
							code: "CONFLICT",
							appCode: "USER_IN_USE",
						});
					}
				}
			}

			const deletedAt = new Date();

			await ctx.prisma.$transaction(async (tx) => {
				for (const user of users) {
					const suffix = `_deleted_${deletedAt.getTime()}`;

					// 1 & 3: Soft delete user and append suffix to email & nationalCode
					await tx.user.update({
						where: { id: user.id },
						data: {
							deletedAt,
							email: `${user.email}${suffix}`,
							nationalCode: `${user.nationalCode}${suffix}`,
						},
					});

					// Soft delete userSchools
					await tx.userSchool.updateMany({
						where: { userId: user.id },
						data: { deletedAt, status: "left", leftAt: deletedAt, isDefault: false },
					});

					// 2: Delete auth sessions & accounts (hard delete)
					await tx.authSession.deleteMany({
						where: { userId: user.id },
					});
					await tx.authAccount.deleteMany({
						where: { userId: user.id },
					});
				}
			});

			return { ids: users.map((u) => u.id) };
		}),
});
