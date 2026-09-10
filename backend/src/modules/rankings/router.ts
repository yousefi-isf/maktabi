import { z } from "zod";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { TRPCError } from "@trpc/server";
import {
  getStudentRankings,
  calculateAndSyncStudentGpa,
} from "./service.js";

export const rankingsRouter = router({
  // ==========================================
  // 0. Filter Options (Academic Years, Grades, Fields, Classes)
  // ==========================================
  getFilterOptions: tenantProcedure.query(async ({ ctx }) => {
    const schoolId = ctx.activeSchoolId;
    const [academicYears, gradeLevels, fieldsOfStudy, classes] = await Promise.all([
      ctx.prisma.academicYear.findMany({
        where: { schoolId, deletedAt: null },
        select: { id: true, title: true, isActive: true },
        orderBy: { startDate: "desc" },
      }),
      ctx.prisma.gradeLevel.findMany({
        where: { schoolId, deletedAt: null },
        select: { id: true, title: true, orderIndex: true },
        orderBy: { orderIndex: "asc" },
      }),
      ctx.prisma.fieldOfStudy.findMany({
        where: { schoolId, deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      ctx.prisma.schoolClass.findMany({
        where: { schoolId, deletedAt: null },
        select: {
          id: true,
          name: true,
          academicYearId: true,
          gradeLevelId: true,
          fieldOfStudyId: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      academicYears,
      gradeLevels,
      fieldsOfStudy,
      classes,
    };
  }),

  // ==========================================
  // 1. Get Student Rankings
  // ==========================================
  getStudentRankings: tenantProcedure
    .input(
      z.object({
        academicYearId: z.string().min(1, "انتخاب سال تحصیلی الزامی است"),
        gradeLevelId: z.string().optional(),
        fieldOfStudyId: z.string().optional(),
        classId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_LIST) ||
        ctx.permissions.includes(PERMISSIONS.ASSESSMENT.SCORE_READ);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.IDENTITY.STUDENT_LIST },
        });
      }

      try {
        const result = await getStudentRankings(
          ctx.prisma,
          ctx.activeSchoolId,
          input
        );
        return result;
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        const message = err instanceof Error ? err.message : "خطا در دریافت لیست رتبه‌بندی دانش‌آموزان";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
          cause: err,
        });
      }
    }),

  // ==========================================
  // 2. Recalculate & Sync All GPAs
  // ==========================================
  recalculateGpas: tenantProcedure
    .input(
      z.object({
        academicYearId: z.string().min(1, "انتخاب سال تحصیلی الزامی است"),
        classId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.ASSESSMENT.SCORE_UPDATE) ||
        ctx.permissions.includes(PERMISSIONS.IMPORTER.REPORT_CARD_EXECUTE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.ASSESSMENT.SCORE_UPDATE },
        });
      }

      try {
        // Find all active enrollments for this year
        const enrollments = await ctx.prisma.enrollment.findMany({
          where: {
            schoolId: ctx.activeSchoolId,
            academicYearId: input.academicYearId,
            deletedAt: null,
            ...(input.classId ? { classId: input.classId } : {}),
          },
          select: { studentId: true },
        });

        let updatedCount = 0;
        for (const e of enrollments) {
          await calculateAndSyncStudentGpa(
            ctx.prisma,
            e.studentId,
            input.academicYearId
          );
          updatedCount++;
        }

        return {
          success: true,
          totalUpdated: updatedCount,
          message: `معدل ${updatedCount} دانش‌آموز با موفقیت بر اساس نمرات خام دیتابیس مجدداً محاسبه و همگام گردید.`,
        };
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        const message = err instanceof Error ? err.message : "خطا در محاسبه مجدد معدل‌ها";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: err,
        });
      }
    }),
});

export type RankingsRouter = typeof rankingsRouter;
