import { Prisma } from "@maktabi/db";
import { z } from "zod";
import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { paginatePrisma, searchInput } from "../../lib/pagination.js";

const CREATE_PERMISSION: PermissionCode = "academic.year.create";
const UPDATE_PERMISSION: PermissionCode = "academic.year.update";
const DELETE_PERMISSION: PermissionCode = "academic.year.delete";
const LIST_PERMISSION: PermissionCode = "academic.year.list";

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

const updateInput = createInput.extend({
	id: z.uuid(),
});

const deleteInput = z.object({
	id: z.uuid(),
});

export const academicYearsRouter = router({
	create: tenantProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: CREATE_PERMISSION } });
			}

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const existingAcademicYear = await tx.academicYear.findFirst({
						where: { schoolId: ctx.activeSchoolId, title: input.title, deletedAt: null },
						select: { id: true },
					});
					if (existingAcademicYear) {
						throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_TITLE_EXISTS", params: { title: input.title } });
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
						throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_DATE_OVERLAP", params: { title: overlappingAcademicYear.title } });
					}

					if (input.isActive) {
						await tx.academicYear.updateMany({
							where: { schoolId: ctx.activeSchoolId, isActive: true, deletedAt: null },
							data: { isActive: false },
						});
					}

					return tx.academicYear.create({
						data: { schoolId: ctx.activeSchoolId, title: input.title, startDate: input.startDate, endDate: input.endDate, isActive: input.isActive },
						select: { id: true, title: true, startDate: true, endDate: true, isActive: true },
					});
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_TITLE_EXISTS", params: { title: input.title } });
				}
				throw error;
			}
		}),

	update: tenantProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(UPDATE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: UPDATE_PERMISSION } });
			}

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const existingAcademicYear = await tx.academicYear.findFirst({
						where: { schoolId: ctx.activeSchoolId, title: input.title, id: { not: input.id }, deletedAt: null },
						select: { id: true },
					});
					if (existingAcademicYear) {
						throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_TITLE_EXISTS", params: { title: input.title } });
					}

					const overlappingAcademicYear = await tx.academicYear.findFirst({
						where: {
							schoolId: ctx.activeSchoolId,
							deletedAt: null,
							id: { not: input.id },
							startDate: { lte: input.endDate },
							endDate: { gte: input.startDate },
						},
						select: { title: true },
					});
					if (overlappingAcademicYear) {
						throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_DATE_OVERLAP", params: { title: overlappingAcademicYear.title } });
					}

					if (input.isActive) {
						await tx.academicYear.updateMany({
							where: { schoolId: ctx.activeSchoolId, isActive: true, deletedAt: null, id: { not: input.id } },
							data: { isActive: false },
						});
					}

					return tx.academicYear.update({
						where: { id: input.id },
						data: { title: input.title, startDate: input.startDate, endDate: input.endDate, isActive: input.isActive },
						select: { id: true, title: true, startDate: true, endDate: true, isActive: true },
					});
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_TITLE_EXISTS", params: { title: input.title } });
				}
				throw error;
			}
		}),

	list: tenantProcedure
		.input(searchInput)
		.query(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(LIST_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: LIST_PERMISSION } });
			}

			const { q, ...pagination } = input;
			const where: Prisma.AcademicYearWhereInput = {
				schoolId: ctx.activeSchoolId,
				deletedAt: null,
				...(q ? { title: { contains: q, mode: Prisma.QueryMode.insensitive } } : {}),
			};

			const select = {
				id: true,
				title: true,
				startDate: true,
				endDate: true,
				isActive: true,
			} satisfies Prisma.AcademicYearSelect;

			type ListPayload = Prisma.AcademicYearGetPayload<{ select: typeof select }>;

			return paginatePrisma(
				ctx.prisma.academicYear,
				pagination,
				{
					where,
					orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
					select
				},
				(item) => item as unknown as ListPayload
			);
		}),

	delete: tenantProcedure
		.input(deleteInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(DELETE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: DELETE_PERMISSION } });
			}

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const academicYear = await tx.academicYear.findFirst({
						where: { id: input.id, schoolId: ctx.activeSchoolId, deletedAt: null },
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
						throw appError({ code: "NOT_FOUND", appCode: "ACADEMIC_YEAR_NOT_FOUND" });
					}

					const hasRelatedRecords = Object.values(academicYear._count).some((count) => count > 0);
					if (hasRelatedRecords) {
						throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_IN_USE" });
					}

					await tx.academicYear.delete({ where: { id: academicYear.id } });
					return { id: academicYear.id };
				});
			} catch (error) {
				if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
					throw error;
				}

				if (error.code === "P2003") {
					throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_IN_USE" });
				}
				if (error.code === "P2025") {
					throw appError({ code: "NOT_FOUND", appCode: "ACADEMIC_YEAR_NOT_FOUND" });
				}

				throw error;
			}
		}),
});

