import { z } from "zod";
import { appError } from "../../trpc/app-error.js";
import {
	platformProcedure,
	protectedProcedure,
	router,
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

export const authRouter = router({
	me: platformProcedure.query(async ({ ctx }) => {
		const memberships = await ctx.prisma.userSchool.findMany({
			where: {
				userId: ctx.user.id,
				status: "active",
				deletedAt: null,
				school: { deletedAt: null },
			},
			orderBy: [{ isDefault: "desc" }, { joinedAt: "asc" }],
			select: {
				schoolId: true,
				isDefault: true,
				school: { select: { id: true, name: true } },
			},
		});

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
			schools: memberships.map(({ school, isDefault }) => ({
				...school,
				isDefault,
			})),
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
});
