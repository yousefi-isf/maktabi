import { z } from "zod";
import { appError } from "../../trpc/app-error.js";
import {
	platformProcedure,
	protectedProcedure,
	publicProcedure,
	router,
	superAdminProcedure,
} from "../../trpc/trpc.js";
import {
	getAccessSummary,
	getActiveMembershipAccess,
	SUPER_ADMIN_ACCESS,
} from "./access.js";

/* -------------------------- Switch school input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "schoolId": "550e8400-e29b-41d4-a716-446655440000"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const switchSchoolInput = z.object({
	schoolId: z.uuid(),
});

/* ----------------------- Invited user input (JSON): ----------------------- */
/**
 * {
 *   "json": {
 *     "token": "OJ8bkrBWkrVZ31FtsxXWGDxJ9ZneDvGF3evK2H6AVbo"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const invitedUserInput = z.object({
	token: z.string().min(1),
});

export const authRouter = router({
	me: platformProcedure.query(async ({ ctx }) => {
		// Super admins have no memberships — every school is available to them.
		const schools = ctx.user.isSuperAdmin
			? (
				await ctx.prisma.school.findMany({
					where: { deletedAt: null },
					orderBy: { name: "asc" },
					select: { id: true, name: true, district: true },
				})
			).map((school) => ({ ...school, isDefault: false }))
			: (
				await ctx.prisma.userSchool.findMany({
					where: {
						userId: ctx.user.id,
						status: "active",
						deletedAt: null,
						school: { deletedAt: null },
					},
					orderBy: [{ isDefault: "desc" }, { joinedAt: "asc" }],
					select: {
						isDefault: true,
						school: { select: { id: true, name: true, district: true } },
					},
				})
			).map(({ school, isDefault }) => ({ ...school, isDefault }));

		let currentSchool = null;
		if (ctx.membership) {
			currentSchool = {
				id: ctx.membership.school.id,
				name: ctx.membership.school.name,
				district: ctx.membership.school.district,
			};
		} else if (ctx.activeSchoolId) {
			currentSchool = await ctx.prisma.school.findFirst({
				where: { id: ctx.activeSchoolId, deletedAt: null },
				select: { id: true, name: true, district: true },
			});
		}

		return {
			user: ctx.user,
			session: ctx.session,
			currentSchool,
			schools,
			roles: ctx.roles,
			permissions: ctx.permissions,
		};
	}),

	switchSchool: protectedProcedure
		.input(switchSchoolInput)
		.mutation(async ({ ctx, input }) => {
			let school: { id: string; name: string };
			let roles: string[];
			let permissions: string[];

			if (ctx.user.isSuperAdmin) {
				const targetSchool = await ctx.prisma.school.findFirst({
					where: { id: input.schoolId, deletedAt: null },
					select: { id: true, name: true },
				});
				if (!targetSchool) {
					throw appError({
						code: "NOT_FOUND",
						appCode: "SCHOOL_NOT_FOUND",
					});
				}
				school = targetSchool;
				roles = SUPER_ADMIN_ACCESS.roles;
				permissions = SUPER_ADMIN_ACCESS.permissions;
			} else {
				const membership = await getActiveMembershipAccess(
					ctx.user.id,
					input.schoolId,
				);
				if (!membership) {
					throw appError({
						code: "FORBIDDEN",
						appCode: "SCHOOL_MEMBERSHIP_REQUIRED",
					});
				}
				school = membership.school;
				const access = getAccessSummary(membership);
				roles = access.roles;
				permissions = access.permissions;
			}

			const updated = await ctx.prisma.authSession.updateMany({
				where: { id: ctx.session.id, userId: ctx.user.id },
				data: { activeSchoolId: input.schoolId },
			});
			if (updated.count !== 1) {
				throw appError({
					code: "UNAUTHORIZED",
					appCode: "SESSION_EXPIRED",
				});
			}

			return {
				school: { id: school.id, name: school.name },
				roles,
				permissions,
			};
		}),

	// Super admin only: leave the current school context and return to
	// platform-wide mode (activeSchoolId = null).
	clearSchoolContext: superAdminProcedure.mutation(async ({ ctx }) => {
		const updated = await ctx.prisma.authSession.updateMany({
			where: { id: ctx.session.id, userId: ctx.user.id },
			data: { activeSchoolId: null },
		});
		if (updated.count !== 1) {
			throw appError({
				code: "UNAUTHORIZED",
				appCode: "SESSION_EXPIRED",
			});
		}

		return {
			school: null,
			roles: SUPER_ADMIN_ACCESS.roles,
			permissions: SUPER_ADMIN_ACCESS.permissions,
		};
	}),

	invitedUser: publicProcedure
		.input(invitedUserInput)
		.query(async ({ ctx, input }) => {
			const verification = await ctx.prisma.authVerification.findFirst({
				where: {
					identifier: `reset-password:${input.token}`,
					expiresAt: { gt: new Date() },
				},
				select: { value: true },
			});
			if (!verification) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "INVITE_NOT_FOUND",
				});
			}

			const user = await ctx.prisma.user.findFirst({
				where: { id: verification.value, deletedAt: null },
				select: { fullName: true, email: true },
			});
			if (!user) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "INVITE_NOT_FOUND",
				});
			}

			return user;
		}),
});
