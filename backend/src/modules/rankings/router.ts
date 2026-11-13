import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PERMISSIONS } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { calculateCourse, roundGrade, type GpaBasis } from "./gpa-calculation.js";
import { calculateAndSyncStudentGpa, getStudentRankings, toGpaCourses } from "./service.js";

export const rankingsRouter = router({
	/* ――――――― 0. Filter Options (Academic Years, Grades, Fields, Classes) ―――――― */
	getFilterOptions: tenantProcedure.query(async ({ ctx }) => {
        if (!ctx.user.isSuperAdmin && !ctx.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) && !ctx.permissions.includes(PERMISSIONS.ASSESSMENT.SCORE_READ) && !ctx.permissions.includes(PERMISSIONS.IDENTITY.STUDENT_LIST)) {
            throw appError({ code: "FORBIDDEN", appCode: "MISSING_PERMISSION", params: { permission: PERMISSIONS.ASSESSMENT.SCORE_READ } });
        }
		const schoolId = ctx.activeSchoolId;
		const [academicYears, gradeLevels, fieldsOfStudy, classes] =
			await Promise.all([
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

	/* ――――――――――――――――――――――――― 1. Get Student Rankings ―――――――――――――――――――――――― */
	getStudentRankings: tenantProcedure
		.input(
			z.object({
				academicYearId: z.string().min(1, "انتخاب سال تحصیلی الزامی است"),
				gradeLevelId: z.string().optional(),
				fieldOfStudyId: z.string().optional(),
				classId: z.string().optional(),
			}),
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
					input,
				);
				return result;
			} catch (err: unknown) {
				if (err instanceof TRPCError) throw err;
				const message =
					err instanceof Error
						? err.message
						: "خطا در دریافت لیست رتبه‌بندی دانش‌آموزان";
				throw new TRPCError({
					code: "BAD_REQUEST",
					message,
					cause: err,
				});
			}
		}),

	/* ――――――――――――――――――――― 2. Recalculate & Sync All GPAs ――――――――――――――――――――― */
	recalculateGpas: tenantProcedure
		.input(
			z.object({
				academicYearId: z.string().min(1, "انتخاب سال تحصیلی الزامی است"),
				classId: z.string().optional(),
				gradeLevelId: z.string().optional(),
				fieldOfStudyId: z.string().optional(),
			}),
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
						schoolClass: {
							deletedAt: null,
							...(input.gradeLevelId ? { gradeLevelId: input.gradeLevelId } : {}),
							...(input.fieldOfStudyId ? { fieldOfStudyId: input.fieldOfStudyId } : {}),
						},
					},
					select: { studentId: true },
				});

				let updatedCount = 0;
				for (const e of enrollments) {
					const result = await ctx.prisma.$transaction((tx) => calculateAndSyncStudentGpa(
						tx,
						ctx.activeSchoolId,
						e.studentId,
						input.academicYearId,
					));
					if (result.updated) updatedCount++;
				}

				return {
					success: true,
					totalUpdated: updatedCount,
					totalUnchanged: enrollments.length - updatedCount,
					message: updatedCount
						? `معدل ${updatedCount} دانش‌آموز به‌روزرسانی شد؛ ${enrollments.length - updatedCount} مورد بدون تغییر بود.`
						: "تغییری در نمرات و واحدها وجود نداشت؛ معدل‌ها بدون تغییر باقی ماندند.",
				};
			} catch (err: unknown) {
				if (err instanceof TRPCError) throw err;
				const message =
					err instanceof Error ? err.message : "خطا در محاسبه مجدد معدل‌ها";
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message,
					cause: err,
				});
			}
		}),
	/* ―――――――――――――――― 3. Get Student Score Detail (for dialog) ―――――――――――――――― */
	getStudentScoreDetail: tenantProcedure
		.input(
			z.object({
				studentId: z.string().min(1),
				academicYearId: z.string().min(1),
			}),
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
					params: { permission: PERMISSIONS.ASSESSMENT.SCORE_READ },
				});
			}

			// 1. Student + Enrollment info
			const enrollment = await ctx.prisma.enrollment.findFirst({
				where: {
					studentId: input.studentId,
					academicYearId: input.academicYearId,
					schoolId: ctx.activeSchoolId,
					deletedAt: null,
				},
				include: {
					student: {
						include: {
							userSchool: { include: { user: true } },
						},
					},
					schoolClass: {
						include: {
							gradeLevel: true,
							fieldOfStudy: true,
						},
					},
					academicYear: true,
				},
			});

			if (!enrollment) {
				throw appError({
					code: "NOT_FOUND",
					appCode: "STUDENT_NOT_FOUND_IN_ACTIVE_SCHOOL",
				});
			}

			// 2. Scores with full context
			const scores = await ctx.prisma.score.findMany({
				where: {
					studentId: input.studentId,
					schoolId: ctx.activeSchoolId,
					deletedAt: null,
					exam: {
						schoolId: ctx.activeSchoolId,
						deletedAt: null,
						teachingAssignment: {
							academicYearId: input.academicYearId,
							schoolId: ctx.activeSchoolId,
							deletedAt: null,
							subject: { deletedAt: null },
						},
					},
				},
				include: {
					exam: {
						include: {
							subjectModule: true,
							teachingAssignment: {
								include: {
									subject: {
										include: {
											subjectModules: {
												where: { deletedAt: null },
												select: { id: true, weight: true },
											},
										},
									},
									teacher: {
										include: { userSchool: { include: { user: true } } },
									},
								},
							},
							term: { select: { title: true, termNumber: true } },
						},
					},
				},
				orderBy: { id: "asc" },
			});

			// 3. Group by subject
			type SubjectGroup = {
				subjectId: string;
				subjectName: string;
				subjectCode: string;
				unit: number;
				isModular: boolean;
				teacherName: string;
				scores: {
					examId: string;
					examTitle: string;
					examType: string;
					termTitle: string;
					termNumber: number;
					score: number | null;
					isAbsent: boolean;
					moduleId: string | null;
					moduleTitle: string | null;
					moduleOrderIndex: number | null;
				}[];
			};

			const subjectMap = new Map<string, SubjectGroup>();

			for (const s of scores) {
				const subj = s.exam.teachingAssignment.subject;
				const teacher = s.exam.teachingAssignment.teacher;

				if (!subjectMap.has(subj.id)) {
					subjectMap.set(subj.id, {
						subjectId: subj.id,
						subjectName: subj.name,
						subjectCode: subj.code,
						unit: Number(subj.defaultUnit),
						isModular: subj.subjectType === "modular",
						teacherName: teacher.userSchool.user.fullName,
						scores: [],
					});
				}

				subjectMap.get(subj.id)!.scores.push({
					examId: s.examId,
					examTitle: s.exam.title,
					examType: s.exam.examType,
					termTitle: s.exam.term.title,
					termNumber: s.exam.term.termNumber,
					score: s.score !== null ? Number(s.score) : null,
					isAbsent: s.isAbsent,
					moduleId: s.exam.subjectModule?.id ?? null,
					moduleTitle: s.exam.subjectModule?.title ?? null,
					moduleOrderIndex: s.exam.subjectModule?.orderIndex ?? null,
				});
			}

			// Use the same course rules and official import basis as GPA synchronization.
			const courseMap = new Map(toGpaCourses(scores).map((course) => [course.id, course]));
			const basis = enrollment.gpaBasis as unknown as GpaBasis | null;
			const originalMap = new Map(basis?.courses.map((course) => [course.id, course]) ?? []);
			const rounded = (value: number | null) => value === null ? null : roundGrade(value);
			const subjects = Array.from(subjectMap.values()).map((subj) => {
				const grade = calculateCourse(courseMap.get(subj.subjectId)!, originalMap.get(subj.subjectId));
				return {
					...subj,
					continuousAvg: rounded(grade.continuous),
					finalAvg: rounded(grade.final),
					overallAvg: rounded(grade.overall),
					annualScore: rounded(grade.overall),
					isPassed: grade.isPassed,
				};
			});

			// Sort: theoretical first, then modular; within each group by subjectName
			subjects.sort((a, b) => {
				if (a.isModular !== b.isModular) return a.isModular ? 1 : -1;
				return a.subjectName.localeCompare(b.subjectName, "fa");
			});

			const user = enrollment.student.userSchool.user;

			return {
				student: {
					studentId: input.studentId,
					fullName: user.fullName,
					nationalCode: user.nationalCode,
					studentNumber: enrollment.student.studentNumber,
					fatherName: user.fatherName,
					birthDate: user.birthDate
						? user.birthDate.toISOString().split("T")[0]
						: null,
					gender: user.gender,
				},
				enrollment: {
					className: enrollment.schoolClass.name,
					gradeTitle: enrollment.schoolClass.gradeLevel.title,
					fieldTitle: enrollment.schoolClass.fieldOfStudy?.title ?? "عمومی",
					academicYearTitle: enrollment.academicYear.title,
					gpa: enrollment.gpa ? Number(enrollment.gpa) : 0,
					continuousGpa: enrollment.continuousGpa
						? Number(enrollment.continuousGpa)
						: 0,
					finalGpa: enrollment.finalGpa ? Number(enrollment.finalGpa) : 0,
					totalUnitsPassed: enrollment.totalUnitsPassed
						? Number(enrollment.totalUnitsPassed)
						: 0,
					totalUnitsTaken: enrollment.totalUnitsTaken
						? Number(enrollment.totalUnitsTaken)
						: 0,
					totalScoreSum: enrollment.totalScoreSum
						? Number(enrollment.totalScoreSum)
						: 0,
				},
				subjects,
			};
		}),
});

export type RankingsRouter = typeof rankingsRouter;
