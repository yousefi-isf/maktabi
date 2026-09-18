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
		title: z.string({ required_error: "عنوان الزامی است", invalid_type_error: "عنوان نامعتبر است" }).trim().min(1, "عنوان الزامی است").max(100, "عنوان بسیار طولانی است"),
		startDate: z.date({ required_error: "تاریخ شروع الزامی است", invalid_type_error: "تاریخ شروع نامعتبر است" }),
		endDate: z.date({ required_error: "تاریخ پایان الزامی است", invalid_type_error: "تاریخ پایان نامعتبر است" }),
		isActive: z.boolean({ invalid_type_error: "وضعیت نامعتبر است" }).default(false),
	})
	.refine(({ startDate, endDate }) => endDate > startDate, {
		message: "تاریخ پایان باید پس از تاریخ شروع باشد",
		path: ["endDate"],
	});

const updateInput = createInput.extend({
	id: z.string({ required_error: "شناسه الزامی است", invalid_type_error: "شناسه نامعتبر است" }).uuid("شناسه نامعتبر است"),
});

const deleteInput = z.object({
	id: z.union([
		z.string({ required_error: "شناسه الزامی است", invalid_type_error: "شناسه نامعتبر است" }).uuid("شناسه نامعتبر است"), 
		z.array(z.string({ invalid_type_error: "شناسه نامعتبر است" }).uuid("شناسه نامعتبر است")).min(1, "حداقل یک شناسه باید انتخاب شود")
	], { required_error: "شناسه‌ها الزامی هستند" }),
});

const getByIdInput = z.object({
	id: z.string({ required_error: "شناسه الزامی است", invalid_type_error: "شناسه نامعتبر است" }).uuid("شناسه نامعتبر است"),
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

	getById: tenantProcedure
		.input(getByIdInput)
		.query(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(LIST_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: LIST_PERMISSION } });
			}

			const academicYear = await ctx.prisma.academicYear.findFirst({
				where: { id: input.id, schoolId: ctx.activeSchoolId, deletedAt: null },
				select: {
					id: true,
					title: true,
					startDate: true,
					endDate: true,
					isActive: true,
				},
			});

			if (!academicYear) {
				throw appError({ code: "NOT_FOUND", appCode: "ACADEMIC_YEAR_NOT_FOUND" });
			}

			return academicYear;
		}),

	getDeleteStats: tenantProcedure
		.input(getByIdInput)
		.query(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(DELETE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: DELETE_PERMISSION } });
			}
			const stats = await ctx.prisma.academicYear.findFirst({
				where: { id: input.id, schoolId: ctx.activeSchoolId, deletedAt: null },
				select: {
					_count: {
						select: {
							schoolClasses: true,
							enrollments: true,
							teachingAssignments: true,
							curricula: true,
							terms: true,
						}
					}
				}
			});
			if (!stats) throw appError({ code: "NOT_FOUND", appCode: "ACADEMIC_YEAR_NOT_FOUND" });
			return stats._count;
		}),

	delete: tenantProcedure
		.input(z.object({ 
			id: z.union([z.string().uuid(), z.array(z.string().uuid()).min(1)]),
			force: z.boolean().optional().default(false)
		}))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(DELETE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: DELETE_PERMISSION } });
			}

			const ids = Array.isArray(input.id) ? input.id : [input.id];

			try {
				return await ctx.prisma.$transaction(async (tx) => {
					const academicYears = await tx.academicYear.findMany({
						where: { id: { in: ids }, schoolId: ctx.activeSchoolId, deletedAt: null },
						select: {
							id: true,
							title: true,
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

					if (academicYears.length !== ids.length) {
						throw appError({ code: "NOT_FOUND", appCode: "ACADEMIC_YEAR_NOT_FOUND" });
					}

					for (const year of academicYears) {
						const hasRelations =
							year._count.terms > 0 ||
							year._count.schoolClasses > 0 ||
							year._count.enrollments > 0 ||
							year._count.teachingAssignments > 0 ||
							year._count.curricula > 0 ||
							year._count.userRoles > 0;

						if (hasRelations && !input.force) {
							throw appError({ code: "CONFLICT", appCode: "ACADEMIC_YEAR_IN_USE" });
						}
					}

					const toDeleteIds = academicYears.map((a) => a.id);

					if (input.force) {
						// 1. Identify orphaned students (students whose enrollments are ONLY in these academic years)
						const orphanedStudents = await tx.student.findMany({
							where: {
								schoolId: ctx.activeSchoolId,
								enrollments: {
									some: { academicYearId: { in: toDeleteIds } },
									none: { academicYearId: { notIn: toDeleteIds } }
								}
							},
							select: { id: true, userId: true }
						});
						const studentIds = orphanedStudents.map(s => s.id);
						const studentUserIds = orphanedStudents.map(s => s.userId);

						// 2. Identify orphaned subjects (subjects whose curricula are ONLY in these academic years)
						const orphanedSubjects = await tx.subject.findMany({
							where: {
								schoolId: ctx.activeSchoolId,
								curricula: {
									some: { academicYearId: { in: toDeleteIds } },
									none: { academicYearId: { notIn: toDeleteIds } }
								}
							},
							select: { id: true }
						});
						const subjectIds = orphanedSubjects.map(s => s.id);

						// Hard delete all related records inside this academic year (cascade)
						await tx.score.deleteMany({ where: { exam: { term: { academicYearId: { in: toDeleteIds } } } } });
						await tx.exam.deleteMany({ where: { term: { academicYearId: { in: toDeleteIds } } } });
						await tx.attendance.deleteMany({ where: { schoolClass: { academicYearId: { in: toDeleteIds } } } });
						await tx.timetable.deleteMany({ where: { teachingAssignment: { academicYearId: { in: toDeleteIds } } } });
						
						await tx.teachingAssignment.deleteMany({ where: { academicYearId: { in: toDeleteIds } } });
						await tx.curriculum.deleteMany({ where: { academicYearId: { in: toDeleteIds } } });
						await tx.enrollment.deleteMany({ where: { academicYearId: { in: toDeleteIds } } });
						await tx.schoolClass.deleteMany({ where: { academicYearId: { in: toDeleteIds } } });
						await tx.userRole.deleteMany({ where: { academicYearId: { in: toDeleteIds } } });
						await tx.term.deleteMany({ where: { academicYearId: { in: toDeleteIds } } });

						if (studentIds.length > 0) {
							await tx.student.deleteMany({ where: { id: { in: studentIds } } });
							await tx.userSchool.deleteMany({
								where: {
									userId: { in: studentUserIds },
									schoolId: ctx.activeSchoolId,
									teachers: { none: {} },
									userRoles: { none: {} }
								}
							});
						}

						if (subjectIds.length > 0) {
							await tx.subjectModule.deleteMany({ where: { subjectId: { in: subjectIds } } });
							await tx.subject.deleteMany({ where: { id: { in: subjectIds } } });
						}
					}

					await tx.academicYear.deleteMany({ where: { id: { in: toDeleteIds } } });
					return { deletedCount: toDeleteIds.length, ids: toDeleteIds };
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

