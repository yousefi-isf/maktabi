import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { platformProcedure, router } from "../../../trpc/trpc.js";
import { PERMISSIONS } from "../../../config/permissions.js";
import { appError } from "../../../trpc/app-error.js";
import { reportCardBatchDtoSchema } from "./dto.js";
import { parseReportCardText } from "./text-parser.js";
import { importReportCards } from "./service.js";

export const reportCardImporterRouter = router({
	/* ――――――――――――――――――――― 1. Preview text (Dry-run parser) ―――――――――――――――――――― */
	preview: platformProcedure
		.input(
			z.object({
				text: z
					.string()
					.trim()
					.min(1, "متن کارنامه الزامی است")
					.max(5_000_000, "متن کارنامه بیش از حد طولانی است"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Permission check
			const hasPermission =
				ctx.user.isSuperAdmin ||
				ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
				ctx.permissions.includes(PERMISSIONS.IMPORTER.REPORT_CARD_PREVIEW) ||
				ctx.permissions.includes(PERMISSIONS.IMPORTER.REPORT_CARD_EXECUTE);

			if (!hasPermission) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: PERMISSIONS.IMPORTER.REPORT_CARD_PREVIEW },
				});
			}

			try {
				const batch = parseReportCardText(input.text);

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
				const message =
					err instanceof Error
						? err.message
						: "خطا در پردازش و بازخوانی متن کارنامه";
				throw new TRPCError({
					code: "BAD_REQUEST",
					message,
					cause: err,
				});
			}
		}),

	/* ―――――――――――――――――― 2. Import text (Parse + Upsert to DB) ――――――――――――――――― */
	importText: platformProcedure
		.input(
			z.object({
				text: z
					.string()
					.trim()
					.min(1, "متن کارنامه الزامی است")
					.max(5_000_000, "متن کارنامه بیش از حد طولانی است"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const hasPermission =
				ctx.user.isSuperAdmin ||
				ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
				ctx.permissions.includes(PERMISSIONS.IMPORTER.REPORT_CARD_EXECUTE);

			if (!hasPermission) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: PERMISSIONS.IMPORTER.REPORT_CARD_EXECUTE },
				});
			}

			try {
				const batch = parseReportCardText(input.text);

				const result = await importReportCards(batch, {
					prisma: ctx.prisma,
					activeSchoolId: ctx.activeSchoolId,
				});

				return result;
			} catch (err: unknown) {
				if (err instanceof TRPCError) throw err;
				const message =
					err instanceof Error
						? err.message
						: "خطا در ذخیره‌سازی داده‌های کارنامه در پایگاه داده";
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message,
					cause: err,
				});
			}
		}),

	/* ――――――――――――――― 3. Import Batch (Upsert already parsed DTO) ―――――――――――――― */
	importBatch: platformProcedure
		.input(
			z.object({
				batch: reportCardBatchDtoSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const hasPermission =
				ctx.user.isSuperAdmin ||
				ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
				ctx.permissions.includes(PERMISSIONS.IMPORTER.REPORT_CARD_EXECUTE);

			if (!hasPermission) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: PERMISSIONS.IMPORTER.REPORT_CARD_EXECUTE },
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
				const message =
					err instanceof Error
						? err.message
						: "خطا در ذخیره‌سازی دسته کارنامه در پایگاه داده";
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message,
					cause: err,
				});
			}
		}),
});
export type ReportCardImporterRouter = typeof reportCardImporterRouter;
