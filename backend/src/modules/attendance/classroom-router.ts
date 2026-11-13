import { z } from "zod";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { classAccessWhere, requireClassroomAccess } from "./policy.js";
import { confirmClassroom, getClassroomRoster } from "./classroom.service.js";
import { attendanceTeachersRouter } from "./teachers-router.js";

const rosterInput = z.object({ classId: z.uuid(), date: z.string() });

export const classroomRouter = router({
	teachers: attendanceTeachersRouter,
	classes: tenantProcedure.query(({ ctx }) => {
		requireClassroomAccess(ctx);
		return ctx.prisma.schoolClass.findMany({
			where: classAccessWhere(ctx),
			include: {
				academicYear: {
					include: {
						terms: {
							where: { deletedAt: null },
							orderBy: { termNumber: "asc" },
						},
					},
				},
				homeroomTeacher: {
					include: {
						userSchool: { include: { user: { select: { fullName: true } } } },
					},
				},
			},
			orderBy: [{ academicYear: { startDate: "desc" } }, { name: "asc" }],
		});
	}),
	roster: tenantProcedure
		.input(rosterInput)
		.query(({ ctx, input }) => getClassroomRoster(ctx.prisma, ctx, input)),
	confirm: tenantProcedure
		.input(
			rosterInput.extend({
				termId: z.uuid(),
				records: z
					.array(
						z.object({
							studentId: z.uuid(),
							status: z.enum(["present", "absent", "late", "excused"]),
							note: z.string().trim().max(1000).default(""),
						}),
					)
					.min(1)
					.max(200),
			}),
		)
		.mutation(({ ctx, input }) => confirmClassroom(ctx.prisma, ctx, input)),
});
