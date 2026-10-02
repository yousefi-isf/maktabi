import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PERMISSIONS } from "../../config/permissions.js";
import { appError } from "../../trpc/app-error.js";
import { router, tenantProcedure } from "../../trpc/trpc.js";
import { calculateAndSyncStudentGpa, getStudentRankings } from "./service.js";

export const rankingsRouter = router({
	// ==========================================
	// 0. Filter Options (Academic Years, Grades, Fields, Classes)
	// ==========================================
	getFilterOptions: tenantProcedure.query(async ({ ctx }) => {
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

	// ==========================================
	// 1. Get Student Rankings
	// ==========================================
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

	// ==========================================
	// 2. Recalculate & Sync All GPAs
	// ==========================================
	recalculateGpas: tenantProcedure
		.input(
			z.object({
				academicYearId: z.string().min(1, "انتخاب سال تحصیلی الزامی است"),
				classId: z.string().optional(),
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
					},
					select: { studentId: true },
				});

				let updatedCount = 0;
				for (const e of enrollments) {
					await calculateAndSyncStudentGpa(
						ctx.prisma,
						e.studentId,
						input.academicYearId,
					);
					updatedCount++;
				}

				return {
					success: true,
					totalUpdated: updatedCount,
					message: `معدل ${updatedCount} دانش‌آموز با موفقیت بر اساس نمرات خام دیتابیس مجدداً محاسبه و همگام گردید.`,
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
	// ==========================================
	// 3. Get Student Score Detail (for dialog)
	// ==========================================
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
					deletedAt: null,
					exam: {
						teachingAssignment: { academicYearId: input.academicYearId },
					},
				},
				include: {
					exam: {
						include: {
							subjectModule: true,
							teachingAssignment: {
								include: {
									subject: true,
									teacher: {
										include: { userSchool: { include: { user: true } } },
									},
								},
							},
							term: { select: { title: true } },
						},
					},
				},
				orderBy: { exam: { examDate: "asc" } },
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
					score: number | null;
					isAbsent: boolean;
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
					score: s.score !== null ? Number(s.score) : null,
					isAbsent: s.isAbsent,
					moduleTitle: s.exam.subjectModule?.title ?? null,
					moduleOrderIndex: s.exam.subjectModule?.orderIndex ?? null,
				});
			}

			// 4. Compute derived fields per subject
			const subjects = Array.from(subjectMap.values()).map((subj) => {
				if (!subj.isModular) {
					const c1 = subj.scores.find(
						(s) =>
							s.examType === "continuous" && s.examTitle.includes("نوبت اول"),
					);
					const c2 = subj.scores.find(
						(s) =>
							s.examType === "continuous" && !s.examTitle.includes("نوبت اول"),
					);
					const f1 = subj.scores.find(
						(s) =>
							s.examType === "term_final" && s.examTitle.includes("نوبت اول"),
					);
					const f2 = subj.scores.find(
						(s) =>
							s.examType === "term_final" && !s.examTitle.includes("نوبت اول"),
					);

					const v = (x: typeof c1) =>
						x ? (x.isAbsent ? 0 : (x.score ?? 0)) : null;
					const c1v = v(c1),
						c2v = v(c2),
						f1v = v(f1),
						f2v = v(f2);

					let contAvg: number | null = null;
					if (c1v !== null && c2v !== null) contAvg = (c1v + c2v) / 2;
					else if (c2v !== null) contAvg = c2v;
					else if (c1v !== null) contAvg = c1v;

					let finalAvg: number | null = null;
					if (f1v !== null && f2v !== null) finalAvg = (f1v + 2 * f2v) / 3;
					else if (f2v !== null) finalAvg = f2v;
					else if (f1v !== null) finalAvg = f1v;

					const overallAvg =
						contAvg !== null && finalAvg !== null
							? (contAvg + finalAvg * 2) / 3
							: (contAvg ?? finalAvg ?? null);

					const annualScore =
						((c1v ?? 0) + 2 * (f1v ?? 0) + (c2v ?? 0) + 4 * (f2v ?? 0)) / 8;
					const isPassed = annualScore >= 10 && (f2v ?? f1v ?? 0) >= 10;

					return {
						...subj,
						continuousAvg:
							contAvg !== null ? Math.round(contAvg * 100) / 100 : null,
						finalAvg:
							finalAvg !== null ? Math.round(finalAvg * 100) / 100 : null,
						overallAvg:
							overallAvg !== null ? Math.round(overallAvg * 100) / 100 : null,
						annualScore: Math.round(annualScore * 100) / 100,
						isPassed,
					};
				} else {
					// Modular
					const modFinals = subj.scores.filter(
						(s) => s.examType === "modular_competency",
					);
					const allPassed =
						modFinals.length === 5 &&
						modFinals.every((s) => !s.isAbsent && (s.score ?? 0) >= 10);
					const avgScore =
						modFinals.length > 0
							? modFinals.reduce(
									(sum, s) => sum + (s.isAbsent ? 0 : (s.score ?? 0)),
									0,
								) / modFinals.length
							: null;

					return {
						...subj,
						continuousAvg: null,
						finalAvg: null,
						overallAvg:
							avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
						annualScore:
							avgScore !== null ? Math.round(avgScore * 100) / 100 : 0,
						isPassed: allPassed,
					};
				}
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
