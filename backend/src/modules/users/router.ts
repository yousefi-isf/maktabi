import { randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "#env";
import { router, tenantProcedure } from "../../trpc/trpc.js";

const INVITE_PERMISSION = "users.invite";
const INVITE_TTL_MS = 24 * 60 * 60 * 1_000;

const inviteInput = z.object({
  email: z.email(),
  fullName: z.string().trim().min(1).max(200),
  nationalCode: z.string().trim().min(1).max(32),
  phone: z.string().trim().min(1).max(32).optional(),
  schoolId: z.uuid(),
  roleId: z.uuid(),
  academicYearId: z.uuid().optional(),
});

export const usersRouter = router({
  invite: tenantProcedure.input(inviteInput).mutation(async ({ ctx, input }) => {
    if (!ctx.permissions.includes(INVITE_PERMISSION)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing permission: ${INVITE_PERMISSION}`,
      });
    }
    if (input.schoolId !== ctx.activeSchoolId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Users can only be invited to the active school",
      });
    }

    const email = input.email.trim().toLowerCase();
    const token = randomBytes(32).toString("base64url");

    const result = await ctx.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: {
          id: input.roleId,
          deletedAt: null,
          OR: [{ schoolId: input.schoolId }, { schoolId: null }],
        },
        select: { id: true },
      });
      if (!role) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid role" });
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid academic year",
          });
        }
      }

      const collisions = await tx.user.findMany({
        where: {
          OR: [{ email }, { nationalCode: input.nationalCode }],
        },
      });
      const existingUser = collisions.find(
        (user) => user.email === email && user.nationalCode === input.nationalCode,
      );
      if (collisions.length > 0 && !existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email or national code belongs to another user",
        });
      }
      if (existingUser?.deletedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The matching user has been deleted",
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

      const credential = await tx.authAccount.findFirst({
        where: { userId: user.id, providerId: "credential" },
        select: { id: true },
      });
      await tx.authVerification.deleteMany({
        where: {
          value: user.id,
          identifier: { startsWith: "reset-password:" },
        },
      });

      if (credential) {
        return { status: "membership_added" as const, userId: user.id };
      }

      await tx.authVerification.create({
        data: {
          id: randomUUID(),
          identifier: `reset-password:${token}`,
          value: user.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });

      return { status: "invited" as const, userId: user.id };
    });

    if (result.status === "membership_added") return result;

    const inviteUrl = new URL("/set-password", env.CLIENT_ORIGIN);
    inviteUrl.searchParams.set("token", token);
    return { ...result, inviteUrl: inviteUrl.toString() };
  }),
});
