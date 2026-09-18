import { z } from "zod";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { Prisma } from "@maktabi/db";

export const classesRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        academicYearId: z.string().optional(),
        gradeLevelId: z.string().optional(),
        q: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(15),
      })
    )
    .query(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.CLASS_LIST);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.CLASS_LIST },
        });
      }

      const where = {
        schoolId: ctx.activeSchoolId,
        ...(input.academicYearId ? { academicYearId: input.academicYearId } : {}),
        ...(input.gradeLevelId ? { gradeLevelId: input.gradeLevelId } : {}),
        ...(input.q ? { name: { contains: input.q, mode: "insensitive" as const } } : {}),
      };

      const [totalItems, data] = await Promise.all([
        ctx.prisma.schoolClass.count({ where }),
        ctx.prisma.schoolClass.findMany({
          where,
          include: {
            academicYear: true,
            gradeLevel: true,
            fieldOfStudy: true,
            homeroomTeacher: {
              include: { userSchool: { include: { user: true } } },
            },
            _count: {
              select: { enrollments: { where: { deletedAt: null } } },
            },
          },
          orderBy: [{ academicYear: { startDate: "desc" } }, { name: "asc" }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
      ]);

      const totalPages = Math.ceil(totalItems / input.limit);
      return {
        data,
        meta: {
          totalItems,
          totalPages,
          hasNextPage: input.page < totalPages,
          hasPrevPage: input.page > 1,
        },
      };
    }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1, "نام کلاس الزامی است"),
        capacity: z.number().min(1, "ظرفیت کلاس باید بزرگتر از صفر باشد"),
        academicYearId: z.string().uuid("شناسه سال تحصیلی نامعتبر است"),
        gradeLevelId: z.string().uuid("شناسه پایه تحصیلی نامعتبر است"),
        fieldOfStudyId: z.string().uuid().optional().nullable(),
        homeroomTeacherId: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.CLASS_CREATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.CLASS_CREATE },
        });
      }

      const newClass = await ctx.prisma.schoolClass.create({
        data: {
          schoolId: ctx.activeSchoolId,
          name: input.name,
          capacity: input.capacity,
          academicYearId: input.academicYearId,
          gradeLevelId: input.gradeLevelId,
          fieldOfStudyId: input.fieldOfStudyId,
          homeroomTeacherId: input.homeroomTeacherId,
        },
      });

      return newClass;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "نام کلاس الزامی است"),
        capacity: z.number().min(1, "ظرفیت کلاس باید بزرگتر از صفر باشد"),
        academicYearId: z.string().uuid("شناسه سال تحصیلی نامعتبر است"),
        gradeLevelId: z.string().uuid("شناسه پایه تحصیلی نامعتبر است"),
        fieldOfStudyId: z.string().uuid().optional().nullable(),
        homeroomTeacherId: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.CLASS_UPDATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.CLASS_UPDATE },
        });
      }

      const existingClass = await ctx.prisma.schoolClass.findUnique({
        where: { id: input.id },
      });

      if (!existingClass || existingClass.schoolId !== ctx.activeSchoolId) {
        throw appError({
          code: "NOT_FOUND",
          appCode: "RESOURCE_NOT_FOUND",
        });
      }

      const updatedClass = await ctx.prisma.schoolClass.update({
        where: { id: input.id },
        data: {
          name: input.name,
          capacity: input.capacity,
          academicYearId: input.academicYearId,
          gradeLevelId: input.gradeLevelId,
          fieldOfStudyId: input.fieldOfStudyId,
          homeroomTeacherId: input.homeroomTeacherId,
        },
      });

      return updatedClass;
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ACADEMIC.CLASS_DELETE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ACADEMIC.CLASS_DELETE },
        });
      }

      const existingClass = await ctx.prisma.schoolClass.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { enrollments: { where: { deletedAt: null } } }
          }
        }
      });

      if (!existingClass || existingClass.schoolId !== ctx.activeSchoolId) {
        throw appError({
          code: "NOT_FOUND",
          appCode: "RESOURCE_NOT_FOUND",
        });
      }

      if (existingClass._count.enrollments > 0) {
        throw appError({
          code: "BAD_REQUEST",
          appCode: "RELATION_VIOLATION",
          message: "امکان حذف این کلاس وجود ندارد زیرا دانش‌آموزانی در آن ثبت‌نام کرده‌اند.",
        });
      }

      await ctx.prisma.schoolClass.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
