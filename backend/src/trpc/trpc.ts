import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";
import { getActiveMembershipAccess, getAccessSummary } from "../modules/auth/access.js";
import { AppErrorCause, appError } from "./app-error.js";
import type { Context } from "./context.js";

z.config(z.locales.fa());

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause instanceof AppErrorCause ? error.cause : null;

    return {
      ...shape,
      data: {
        ...shape.data,
        appCode: cause?.appCode ?? null,
        params: cause?.params ?? null,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? z.flattenError(error.cause)
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// just login
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.authSession) {
    throw appError({
      code: "UNAUTHORIZED",
      appCode: "AUTHENTICATION_REQUIRED",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.authSession.session,
      user: ctx.authSession.user,
    },
  });
});


// tenant (چند مستاجری)
export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const activeSchoolId = ctx.session.activeSchoolId;
  if (!activeSchoolId) {
    throw appError({
      code: "FORBIDDEN",
      appCode: "ACTIVE_SCHOOL_NOT_SELECTED",
    });
  }

  const membership = await getActiveMembershipAccess(ctx.user.id, activeSchoolId);
  if (!membership) {
    throw appError({
      code: "FORBIDDEN",
      appCode: "ACTIVE_SCHOOL_MEMBERSHIP_INVALID",
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
