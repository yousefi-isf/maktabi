import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";
import {
  getAccessSummary,
  getActiveMembershipAccess,
  SUPER_ADMIN_ACCESS,
  type Membership,
} from "../modules/auth/access.js";
import { AppErrorCause, appError } from "./app-error.js";
import type { Context } from "./context.js";

z.config(z.locales.fa());

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // const cause = error.cause instanceof AppErrorCause ? error.cause : null;

    // return {
    //   ...shape,
    //   data: {
    //     ...shape.data,
    //     appCode: cause?.appCode ?? null,
    //     params: cause?.params ?? null,
    //     zodError:
    //       error.code === "BAD_REQUEST" && error.cause instanceof ZodError
    //         ? z.flattenError(error.cause)
    //         : null,
    //   },
    // };
    const cause = error.cause instanceof AppErrorCause ? error.cause : null;

    const zodInputError =
      error.code === "BAD_REQUEST" && error.cause instanceof ZodError
        ? z.flattenError(error.cause)
        : null;

    const zodBusinessError = cause?.field
      ? {
        formErrors: [] as string[],
        fieldErrors: { [cause.field]: [cause.message] },
      }
      : null;

    return {
      ...shape,
      data: {
        ...shape.data,
        appCode: cause?.appCode ?? null,
        params: cause?.params ?? null,
        // هر دو نوع خطا از یک شکل واحد استفاده می‌کنن
        zodError: zodInputError ?? zodBusinessError,
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

// system-wide, outside any school context
export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isSuperAdmin) {
    throw appError({
      code: "FORBIDDEN",
      appCode: "SUPER_ADMIN_REQUIRED",
    });
  }

  return next({ ctx });
});

type AccessContext = {
  activeSchoolId: string | null;
  membership: Membership | null;
  roles: string[];
  permissions: string[];
};

// tenant (چند مستاجری) — active school optional (super admins may act platform-wide)
export const platformProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    let access: AccessContext;

    if (ctx.user.isSuperAdmin) {
      access = {
        activeSchoolId: ctx.session.activeSchoolId ?? null,
        membership: null,
        roles: SUPER_ADMIN_ACCESS.roles,
        permissions: SUPER_ADMIN_ACCESS.permissions,
      };
    } else {
      const activeSchoolId = ctx.session.activeSchoolId;
      if (!activeSchoolId) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "ACTIVE_SCHOOL_NOT_SELECTED",
        });
      }

      const membership = await getActiveMembershipAccess(
        ctx.user.id,
        activeSchoolId,
      );
      if (!membership) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "ACTIVE_SCHOOL_MEMBERSHIP_INVALID",
        });
      }

      const summary = getAccessSummary(membership);
      access = {
        activeSchoolId,
        membership,
        roles: summary.roles,
        permissions: summary.permissions,
      };
    }

    return next({
      ctx: {
        ...ctx,
        ...access,
      },
    });
  },
);

// tenant (چند مستاجری) — active school required
export const tenantProcedure = platformProcedure.use(({ ctx, next }) => {
  const activeSchoolId = ctx.activeSchoolId;
  if (!activeSchoolId) {
    throw appError({
      code: "FORBIDDEN",
      appCode: "ACTIVE_SCHOOL_NOT_SELECTED",
    });
  }

  return next({
    ctx: {
      ...ctx,
      activeSchoolId,
    },
  });
});
