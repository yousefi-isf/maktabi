import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../../trpc/trpc.js";
import { getAccessSummary, getActiveMembershipAccess } from "./access.js";

export const authRouter = router({
  me: tenantProcedure.query(async ({ ctx }) => {
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

    return {
      user: ctx.user,
      session: ctx.session,
      currentSchool: {
        id: ctx.membership.school.id,
        name: ctx.membership.school.name,
      },
      schools: memberships.map(({ school, isDefault }) => ({
        ...school,
        isDefault,
      })),
      roles: ctx.roles,
      permissions: ctx.permissions,
    };
  }),

  switchSchool: protectedProcedure
    .input(z.object({ schoolId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await getActiveMembershipAccess(ctx.user.id, input.schoolId);
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have an active membership in that school",
        });
      }

      const updated = await ctx.prisma.authSession.updateMany({
        where: { id: ctx.session.id, userId: ctx.user.id },
        data: { activeSchoolId: input.schoolId },
      });
      if (updated.count !== 1) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The current session no longer exists",
        });
      }

      const access = getAccessSummary(membership);
      return {
        school: { id: membership.school.id, name: membership.school.name },
        roles: access.roles,
        permissions: access.permissions,
      };
    }),
});
