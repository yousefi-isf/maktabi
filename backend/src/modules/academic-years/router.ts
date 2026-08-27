import { Prisma } from "@maktabi/db";
import { z } from "zod";
import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";

const CREATE_PERMISSION: PermissionCode = "academic.year.create";
const DELETE_PERMISSION: PermissionCode = "academic.year.delete";

/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "title": "1405-1406",
 *     "startDate": "2026-09-23T00:00:00.000Z",
 *     "endDate": "2027-06-22T00:00:00.000Z",
 *     "isActive": true
 *   },
 *   "meta": {
 *     "values": {
 *       "startDate": ["Date"],
 *       "endDate": ["Date"]
 *     },
 *     "v": 1
 *   }
 * }
 */
const createInput = z
	.object({
		title: z.string().trim().min(1).max(100),
		startDate: z.date(),
		endDate: z.date(),
		isActive: z.boolean().default(false),
	})
	.refine(({ startDate, endDate }) => endDate > startDate, {
		message: "تاریخ پایان باید بعد از تاریخ شروع باشد",
		path: ["endDate"],
	});

/* -------------------------- Delete input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const deleteInput = z.object({
	id: z.uuid(),
});

export const academicYearsRouter = router({
	create: tenantProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: CREATE_PERMISSION },
				});
			}

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const existingAcademicYear = await tx.academicYear.findFirst({
						where: {
							schoolId: ctx.activeSchoolId,
							title: input.title,
							deletedAt: null,
						},
						select: { id: true },
					});
					if (existingAcademicYear) {
						throw appError({
							code: "CONFLICT",
							appCode: "ACADEMIC_YEAR_TITLE_EXISTS",
							params: { title: input.title },
						});
					}

					const overlappingAcademicYear = await tx.academicYear.findFirst({
						where: {
							schoolId: ctx.activeSchoolId,
							deletedAt: null,
							startDate: { lte: input.endDate },
							endDate: { gte: input.startDate },
						},
						select: { title: true },
					});
					if (overlappingAcademicYear) {
						throw appError({
							code: "CONFLICT",
							appCode: "ACADEMIC_YEAR_DATE_OVERLAP",
							params: { title: overlappingAcademicYear.title },
						});
					}

					// When the new academic year is active, deactivate the previous active year within the same transaction.
					if (input.isActive) {
						await tx.academicYear.updateMany({
							where: {
								schoolId: ctx.activeSchoolId,
								isActive: true,
								deletedAt: null,
							},
							data: { isActive: false },
						});
					}

					return tx.academicYear.create({
						data: {
							schoolId: ctx.activeSchoolId,
							title: input.title,
							startDate: input.startDate,
							endDate: input.endDate,
							isActive: input.isActive,
						},
						select: {
							id: true,
							title: true,
							startDate: true,
							endDate: true,
							isActive: true,
						},
					});
				});
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2002"
				) {
					throw appError({
						code: "CONFLICT",
						appCode: "ACADEMIC_YEAR_TITLE_EXISTS",
						params: { title: input.title },
					});
				}

				throw error;
			}
		}),

	list: tenantProcedure.query(({ ctx }) =>
		ctx.prisma.academicYear.findMany({
			where: {
				schoolId: ctx.activeSchoolId,
				deletedAt: null,
			},
			orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
			select: {
				id: true,
				title: true,
				startDate: true,
				endDate: true,
				isActive: true,
			},
		}),
	),

	delete: tenantProcedure
		.input(deleteInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(DELETE_PERMISSION)) {
				throw appError({
					code: "FORBIDDEN",
					appCode: "MISSING_PERMISSION",
					params: { permission: DELETE_PERMISSION },
				});
			}

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const academicYear = await tx.academicYear.findFirst({
						where: {
							id: input.id,
							schoolId: ctx.activeSchoolId,
							deletedAt: null,
						},
						select: {
							id: true,
							_count: {
								select: {
									terms: true,
									schoolClasses: true,
									enrollments: true,
									teachingAssignments: true,
									curricula: true,
									userRoles: true,
								},
							},
						},
					});

					if (!academicYear) {
						throw appError({
							code: "NOT_FOUND",
							appCode: "ACADEMIC_YEAR_NOT_FOUND",
						});
					}

					const hasRelatedRecords = Object.values(academicYear._count).some(
						(count) => count > 0,
					);
					if (hasRelatedRecords) {
						throw appError({
							code: "CONFLICT",
							appCode: "ACADEMIC_YEAR_IN_USE",
						});
					}

					await tx.academicYear.delete({
						where: { id: academicYear.id },
					});

					return { id: academicYear.id };
				});
			} catch (error) {
				if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
					throw error;
				}

				if (error.code === "P2003") {
					throw appError({
						code: "CONFLICT",
						appCode: "ACADEMIC_YEAR_IN_USE",
					});
				}
				if (error.code === "P2025") {
					throw appError({
						code: "NOT_FOUND",
						appCode: "ACADEMIC_YEAR_NOT_FOUND",
					});
				}

				throw error;
			}
		}),
});
