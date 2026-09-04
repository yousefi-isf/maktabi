import { Prisma } from "@maktabi/db";
import { z } from "zod";
import type { PermissionCode } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { paginatePrisma, searchInput } from "../../lib/pagination.js";

const CREATE_PERMISSION: PermissionCode = "academic.field.create";
const UPDATE_PERMISSION: PermissionCode = "academic.field.update";
const DELETE_PERMISSION: PermissionCode = "academic.field.delete";
const LIST_PERMISSION: PermissionCode = "academic.field.list";

const createInput = z.object({
	title: z.string().trim().min(1).max(100),
	branch: z.enum(["theoretical", "technical", "vocational"]),
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

export const fieldsOfStudyRouter = router({
	getById: tenantProcedure
		.input(getByIdInput)
		.query(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(LIST_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: LIST_PERMISSION } });
			}

			const field = await ctx.prisma.fieldOfStudy.findFirst({
				where: { id: input.id, schoolId: ctx.activeSchoolId, deletedAt: null },
				select: { id: true, title: true, branch: true },
			});

			if (!field) {
				throw appError({ code: "NOT_FOUND", appCode: "FIELD_OF_STUDY_NOT_FOUND" });
			}

			return field;
		}),

	create: tenantProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.permissions.includes(CREATE_PERMISSION)) {
				throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: CREATE_PERMISSION } });
			}

			try {
				return await ctx.prisma.fieldOfStudy.create({
					data: {
						schoolId: ctx.activeSchoolId,
						title: input.title,
						branch: input.branch,
					},
					select: { id: true, title: true, branch: true },
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					throw appError({ code: "CONFLICT", appCode: "FIELD_OF_STUDY_TITLE_EXISTS", params: { title: input.title } });
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
				const existingField = await ctx.prisma.fieldOfStudy.findFirst({
					where: { schoolId: ctx.activeSchoolId, id: input.id, deletedAt: null },
				});

				if (!existingField) {
					throw appError({ code: "NOT_FOUND", appCode: "FIELD_OF_STUDY_NOT_FOUND" });
				}

				return await ctx.prisma.fieldOfStudy.update({
					where: { id: input.id },
					data: { title: input.title, branch: input.branch },
					select: { id: true, title: true, branch: true },
				});
			} catch (error) {
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					throw appError({ code: "CONFLICT", appCode: "FIELD_OF_STUDY_TITLE_EXISTS", params: { title: input.title } });
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
			const where: Prisma.FieldOfStudyWhereInput = {
				schoolId: ctx.activeSchoolId,
				deletedAt: null,
				...(q ? { title: { contains: q, mode: Prisma.QueryMode.insensitive } } : {}),
			};

			const select = {
				id: true,
				title: true,
				branch: true,
			} satisfies Prisma.FieldOfStudySelect;

			type ListPayload = Prisma.FieldOfStudyGetPayload<{ select: typeof select }>;

			return paginatePrisma(
				ctx.prisma.fieldOfStudy,
				pagination,
				{
					where,
					orderBy: { title: "asc" },
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
				const fields = await tx.fieldOfStudy.findMany({
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

				if (fields.length === 0) {
					throw appError({ code: "NOT_FOUND", appCode: "FIELD_OF_STUDY_NOT_FOUND" });
				}

				for (const field of fields) {
					const hasRelatedRecords = Object.values(field._count).some((count) => count > 0);
					if (hasRelatedRecords) {
						throw appError({ code: "CONFLICT", appCode: "FIELD_OF_STUDY_IN_USE" });
					}
				}

				const fieldIds = fields.map(f => f.id);

				await tx.fieldOfStudy.updateMany({
					where: { id: { in: fieldIds } },
					data: { deletedAt: new Date() },
				});

				return { deletedCount: fieldIds.length, ids: fieldIds };
			});
		}),
});

