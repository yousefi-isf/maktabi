import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	PERMISSIONS,
	PERMISSION_DESCRIPTIONS,
} from "../../config/permissions.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { requirePermission } from "./policy.js";

const staffProcedure = tenantProcedure.use(({ ctx, next }) => {
	requirePermission(ctx, PERMISSIONS.ENROLLMENT.TEACHER_ASSIGN);
	return next({ ctx });
});

export const attendanceTeachersRouter = router({
	list: staffProcedure.query(({ ctx }) =>
		ctx.prisma.teacher.findMany({
			where: {
				schoolId: ctx.activeSchoolId,
				deletedAt: null,
				userSchool: {
					status: "active",
					deletedAt: null,
					user: { deletedAt: null },
				},
			},
			select: {
				id: true,
				userId: true,
				userSchool: {
					select: {
						user: {
							select: {
								fullName: true,
								email: true,
								authAccounts: {
									where: { providerId: "credential" },
									select: { id: true },
								},
							},
						},
					},
				},
			},
			orderBy: { userSchool: { user: { fullName: "asc" } } },
		}),
	),
	create: staffProcedure
		.input(
			z.object({
				fullName: z.string().trim().min(1).max(200),
				email: z.email(),
				nationalCode: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			for (const permission of [
				PERMISSIONS.IDENTITY.USER_CREATE,
				PERMISSIONS.IDENTITY.ROLE_ASSIGN,
				PERMISSIONS.ATTENDANCE.RECORD_CREATE,
				PERMISSIONS.ATTENDANCE.RECORD_UPDATE,
			])
				requirePermission(ctx, permission);
			return ctx.prisma.$transaction(async (tx) => {
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${ctx.activeSchoolId}:attendance-teachers`}))`;
				const email = input.email.toLowerCase();
				const collisions = await tx.user.findMany({
					where: { OR: [{ email }, { nationalCode: input.nationalCode }] },
				});
				let user = collisions.find(
					(user) =>
						user.email === email &&
						user.nationalCode === input.nationalCode &&
						!user.deletedAt,
				);
				if (collisions.length && !user)
					throw new TRPCError({
						code: "CONFLICT",
						message: "ایمیل یا کد ملی متعلق به کاربر دیگری است.",
					});
				user ??= await tx.user.create({
					data: {
						email,
						nationalCode: input.nationalCode,
						fullName: input.fullName,
					},
				});
				const memberships = await tx.userSchool.count({
					where: { userId: user.id, status: "active", deletedAt: null },
				});
				await tx.userSchool.upsert({
					where: {
						userId_schoolId: { userId: user.id, schoolId: ctx.activeSchoolId },
					},
					create: {
						userId: user.id,
						schoolId: ctx.activeSchoolId,
						joinedAt: new Date(),
						isDefault: memberships === 0,
					},
					update: { status: "active", deletedAt: null, leftAt: null },
				});
				// Teacher/role/permission indexes are partial in the database;
				// native ON CONFLICT upserts cannot target those indexes.
				const teacher =
					(await tx.teacher.findFirst({
						where: {
							userId: user.id,
							schoolId: ctx.activeSchoolId,
							deletedAt: null,
						},
					})) ??
					(await tx.teacher.create({
						data: { userId: user.id, schoolId: ctx.activeSchoolId },
					}));
				const role =
					(await tx.role.findFirst({
						where: {
							schoolId: ctx.activeSchoolId,
							name: "معلم حضور و غیاب",
							deletedAt: null,
						},
					})) ??
					(await tx.role.create({
						data: {
							schoolId: ctx.activeSchoolId,
							name: "معلم حضور و غیاب",
							description: "تثبیت حضور روزانه در کلاس‌های مرتبط",
						},
					}));

				for (const code of [
					PERMISSIONS.ATTENDANCE.RECORD_CREATE,
					PERMISSIONS.ATTENDANCE.RECORD_UPDATE,
				]) {
					const permission =
						(await tx.permission.findFirst({
							where: { code, deletedAt: null },
						})) ??
						(await tx.permission.create({
							data: { code, description: PERMISSION_DESCRIPTIONS[code] },
						}));
					await tx.rolePermission.upsert({
						where: {
							roleId_permissionId: {
								roleId: role.id,
								permissionId: permission.id,
							},
						},
						create: { roleId: role.id, permissionId: permission.id },
						update: {},
					});
				}
				if (
					!(await tx.userRole.findFirst({
						where: {
							userId: user.id,
							schoolId: ctx.activeSchoolId,
							roleId: role.id,
							academicYearId: null,
						},
					}))
				) {
					await tx.userRole.create({
						data: {
							userId: user.id,
							schoolId: ctx.activeSchoolId,
							roleId: role.id,
						},
					});
				}
				return { teacherId: teacher.id, userId: user.id };
			});
		}),
	assignClass: staffProcedure
		.input(z.object({ classId: z.uuid(), teacherId: z.uuid().nullable() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.$transaction(async (tx) => {
				const schoolClass = await tx.schoolClass.findFirst({
					where: {
						id: input.classId,
						schoolId: ctx.activeSchoolId,
						deletedAt: null,
					},
				});
				if (!schoolClass)
					throw new TRPCError({ code: "NOT_FOUND", message: "کلاس یافت نشد." });
				if (
					input.teacherId &&
					!(await tx.teacher.findFirst({
						where: {
							id: input.teacherId,
							schoolId: ctx.activeSchoolId,
							deletedAt: null,
							userSchool: { status: "active", deletedAt: null },
						},
					}))
				)
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "معلم در این مدرسه فعال نیست.",
					});
				return tx.schoolClass.update({
					where: { id: schoolClass.id },
					data: { homeroomTeacherId: input.teacherId },
				});
			});
		}),
});
