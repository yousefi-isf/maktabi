import { Prisma } from "@maktabi/db";
import { z } from "zod";
import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { paginatePrisma, searchInput } from "../../lib/pagination.js";

const CREATE_PERMISSION: PermissionCode = "academic.grade.create";
const UPDATE_PERMISSION: PermissionCode = "academic.grade.update";
const DELETE_PERMISSION: PermissionCode = "academic.grade.delete";
const LIST_PERMISSION: PermissionCode = "academic.grade.list";

const createInput = z.object({
	title: z.string().trim().min(1).max(100),
	orderIndex: z.number().int().min(1),
	stage: z.enum(["middle_school", "high_school"]),
});

const updateInput = createInput.extend({
	id: z.uuid(),
});

const deleteInput = z.object({
	id: z.union([z.string().uuid(), z.array(z.uuid()).min(1)]),
});

const getByIdInput = z.object({
	id: z.uuid(),
});

export const gradeLevelsRouter = router({
	getById: tenantProcedure
		.input(getByIdInput)
		.query(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(LIST_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: LIST_PERMISSION } });
			}

			const grade = await ctx.prisma.gradeLevel.findFirst({
				where: { id: input.id, schoolId: ctx.activeSchoolId, deletedAt: null },
				select: { id: true, title: true, orderIndex: true, stage: true },
			});

			if (!grade) {
				throw appError({ code: "NOT_FOUND", appCode: "GRADE_LEVEL_NOT_FOUND" });
			}

			return grade;
		}),

	create: tenantProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: CREATE_PERMISSION } });
			}

			try {
				return await ctx.prisma.gradeLevel.create({
					data: {
						schoolId: ctx.activeSchoolId,
						title: input.title,
						orderIndex: input.orderIndex,
						stage: input.stage,
					},
					select: { id: true, title: true, orderIndex: true, stage: true },
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					throw appError({ code: "CONFLICT", appCode: "GRADE_LEVEL_TITLE_EXISTS", params: { title: input.title } });
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
				const existingGrade = await ctx.prisma.gradeLevel.findFirst({
					where: { schoolId: ctx.activeSchoolId, id: input.id, deletedAt: null },
				});

				if (!existingGrade) {
					throw appError({ code: "NOT_FOUND", appCode: "GRADE_LEVEL_NOT_FOUND" });
				}

				return await ctx.prisma.gradeLevel.update({
					where: { id: input.id },
					data: { title: input.title, orderIndex: input.orderIndex, stage: input.stage },
					select: { id: true, title: true, orderIndex: true, stage: true },
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					throw appError({ code: "CONFLICT", appCode: "GRADE_LEVEL_TITLE_EXISTS", params: { title: input.title } });
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
			const where: Prisma.GradeLevelWhereInput = {
				schoolId: ctx.activeSchoolId,
				deletedAt: null,
				...(q ? { title: { contains: q, mode: Prisma.QueryMode.insensitive } } : {}),
			};

			const select = {
				id: true,
				title: true,
				orderIndex: true,
				stage: true,
			} satisfies Prisma.GradeLevelSelect;

			type ListPayload = Prisma.GradeLevelGetPayload<{ select: typeof select }>;

			return paginatePrisma(
				ctx.prisma.gradeLevel,
				pagination,
				{
					where,
					orderBy: { orderIndex: "asc" },
					select,
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

			const ids = Array.isArray(input.id) ? input.id : [input.id];

			return await ctx.prisma.$transaction(async (tx) => {
				const grades = await tx.gradeLevel.findMany({
					where: { id: { in: ids }, schoolId: ctx.activeSchoolId, deletedAt: null },
					select: {
						id: true,
						_count: {
							select: {
								schoolClasses: true,
								curricula: true,
							},
						},
					},
				});

				if (grades.length === 0) {
					throw appError({ code: "NOT_FOUND", appCode: "GRADE_LEVEL_NOT_FOUND" });
				}

				for (const grade of grades) {
					const hasRelatedRecords = Object.values(grade._count).some((count) => count > 0);
					if (hasRelatedRecords) {
						throw appError({ code: "CONFLICT", appCode: "GRADE_LEVEL_IN_USE" });
					}
				}

				const gradeIds = grades.map(f => f.id);

				await tx.gradeLevel.updateMany({
					where: { id: { in: gradeIds } },
					data: { deletedAt: new Date() },
				});

				return { deletedCount: gradeIds.length, ids: gradeIds };
			});
		}),
});
