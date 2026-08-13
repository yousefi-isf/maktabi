import { initTRPC, TRPCError } from "@trpc/server";
import { getActiveMembershipAccess, getAccessSummary } from "../modules/auth/access.js";
import type { Context } from "./context.js";


const t = initTRPC.context<Context>().create({
  // transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.authSession) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.authSession.session,
      user: ctx.authSession.user,
    },
  });
});

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const activeSchoolId = ctx.session.activeSchoolId;
  if (!activeSchoolId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active school is selected",
    });
  }

  const membership = await getActiveMembershipAccess(ctx.user.id, activeSchoolId);
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The active school membership is not valid",
    });
  }

  const access = getAccessSummary(membership);

  return next({
    ctx: {
      ...ctx,
      activeSchoolId,
      membership,
      roles: access.roles,
      permissions: access.permissions,
    },
  });
});
