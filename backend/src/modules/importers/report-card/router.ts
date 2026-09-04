import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { platformProcedure, router } from "../../../trpc/trpc.js";
import { PERMISSIONS } from "../../../config/permissions.js";
import { appError } from "../../../trpc/app-error.js";
import { reportCardBatchDtoSchema } from "./dto.js";
import { parseReportCardPdf } from "./parser.js";
import { importReportCards } from "./service.js";

function decodeBase64File(base64Str: string): Buffer {
  // Remove potential data URI scheme (e.g. data:application/pdf;base64,...)
  const cleanBase64 = base64Str.replace(/^data:application\/[a-zA-Z0-9.-]+;base64,/, "");
  return Buffer.from(cleanBase64, "base64");
}

export const reportCardImporterRouter = router({
  // ==========================================
  // 1. Preview PDF (Dry-run parser)
  // ==========================================
  preview: platformProcedure
    .input(
      z.object({
        fileBase64: z.string().min(1, "فایل کارنامه الزامی است"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Permission check
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_LIST) ||
        ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_CREATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.IDENTITY.STUDENT_LIST },
        });
      }

      try {
        const buffer = decodeBase64File(input.fileBase64);
        const batch = await parseReportCardPdf(buffer);

        return {
          school: batch.school,
          totalStudents: batch.students.length,
          students: batch.students.map((s) => ({
            nationalCode: s.student.nationalCode,
            studentNumber: s.student.studentNumber,
            fullName: `${s.student.firstName} ${s.student.lastName}`.trim(),
            firstName: s.student.firstName,
            lastName: s.student.lastName,
            fatherName: s.student.fatherName,
            birthDate: s.student.birthDate,
            coursesCount: s.courses.length,
            gpa: s.summary.gpa,
            unitsPassed: s.summary.totalUnitsPassed,
            unitsTaken: s.summary.totalUnitsTaken,
          })),
          batch,
        };
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        const message = err instanceof Error ? err.message : "خطا در پردازش و بازخوانی فایل کارنامه";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
          cause: err,
        });
      }
    }),

  // ==========================================
  // 2. Import File (Parse + Upsert to DB)
  // ==========================================
  importFile: platformProcedure
    .input(
      z.object({
        fileBase64: z.string().min(1, "فایل کارنامه الزامی است"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_CREATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.IDENTITY.STUDENT_CREATE },
        });
      }

      try {
        const buffer = decodeBase64File(input.fileBase64);
        const batch = await parseReportCardPdf(buffer);

        const result = await importReportCards(batch, {
          prisma: ctx.prisma,
          activeSchoolId: ctx.activeSchoolId,
        });

        return result;
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        const message = err instanceof Error ? err.message : "خطا در ذخیره‌سازی داده‌های کارنامه در پایگاه داده";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: err,
        });
      }
    }),

  // ==========================================
  // 3. Import Batch (Upsert already parsed DTO)
  // ==========================================
  importBatch: platformProcedure
    .input(
      z.object({
        batch: reportCardBatchDtoSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPermission =
        ctx.user.isSuperAdmin ||
        ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
        ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_CREATE);

      if (!hasPermission) {
        throw appError({
          code: "FORBIDDEN",
          appCode: "MISSING_PERMISSION",
          params: { permission: PERMISSIONS.IDENTITY.STUDENT_CREATE },
        });
      }

      try {
        const result = await importReportCards(input.batch, {
          prisma: ctx.prisma,
          activeSchoolId: ctx.activeSchoolId,
        });

        return result;
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        const message = err instanceof Error ? err.message : "خطا در ذخیره‌سازی دسته کارنامه در پایگاه داده";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: err,
        });
      }
    }),
});
export type ReportCardImporterRouter = typeof reportCardImporterRouter;
