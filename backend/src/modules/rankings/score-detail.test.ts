import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@maktabi/db";
import type { Context } from "../../trpc/context.js";
import { calculateGpa, type GpaBasis } from "./gpa-calculation.js";

process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
const { rankingsRouter } = await import("./router.js");
const { calculateAndSyncStudentGpa, toGpaCourses } = await import(
	"./service.js"
);

function subject(modules: { id: string; weight: number }[] = []) {
	return {
		id: "subject",
		name: "درس",
		code: "100",
		defaultUnit: 2,
		subjectType: modules.length ? "modular" : "theoretical",
		subjectModules: modules,
	};
}
function score(
	id: string,
	type: string,
	term: number,
	value: number | null,
	course = subject(),
	moduleId: string | null = null,
) {
	return {
		id,
		examId: `exam-${id}`,
		score: value,
		isAbsent: false,
		exam: {
			// Deliberately misleading: titles must never determine the term.
			title: term === 1 ? "پایانی نوبت دوم" : "نوبت اول",
			examType: type,
			subjectModuleId: moduleId,
			subjectModule: moduleId
				? { id: moduleId, title: moduleId, orderIndex: 1 }
				: null,
			term: { termNumber: term, title: "عنوان دلخواه" },
			teachingAssignment: {
				subject: course,
				teacher: { userSchool: { user: { fullName: "دبیر" } } },
			},
		},
	};
}

function fixture(rows: ReturnType<typeof score>[], basis?: GpaBasis) {
	let writes = 0;
	const enrollment = {
		id: "enrollment",
		studentId: "student",
		academicYearId: "year",
		schoolId: "school",
		...calculateGpa(toGpaCourses(rows), basis),
		gpaBasis: basis ?? null,
		student: {
			studentNumber: "1",
			userSchool: {
				user: {
					fullName: "دانش‌آموز",
					nationalCode: "0000000000",
					fatherName: null,
					birthDate: null,
					gender: "male",
				},
			},
		},
		schoolClass: {
			name: "کلاس",
			gradeLevel: { title: "دهم" },
			fieldOfStudy: { title: "رشته" },
		},
		academicYear: { title: "1404-1405" },
	};
	const db = {
		enrollment: {
			findFirst: async () => enrollment,
			update: async ({ data }: { data: object }) => {
				writes++;
				Object.assign(enrollment, data);
				return enrollment;
			},
		},
		score: {
			findMany: async ({ where }: { where: Record<string, unknown> }) => {
				assert.equal(where.schoolId, "school");
				assert.equal(where.studentId, "student");
				assert.deepEqual(where.exam, {
					schoolId: "school",
					deletedAt: null,
					teachingAssignment: {
						schoolId: "school",
						academicYearId: "year",
						deletedAt: null,
						subject: { deletedAt: null },
					},
				});
				return rows;
			},
		},
	};
	const api = rankingsRouter.createCaller({
		prisma: db,
		authSession: {
			user: { id: "admin", isSuperAdmin: true },
			session: { activeSchoolId: "school" },
		},
	} as unknown as Context);
	return {
		detail: () =>
			api.getStudentScoreDetail({
				studentId: "student",
				academicYearId: "year",
			}),
		sync: () =>
			calculateAndSyncStudentGpa(
				db as unknown as PrismaClient,
				"school",
				"student",
				"year",
			),
		get writes() {
			return writes;
		},
	};
}

test("detail uses term numbers and excludes unrecorded grades instead of treating them as zero", async () => {
	const rows = [
		score("c1", "continuous", 1, 10),
		score("f1", "term_final", 1, 20),
		score("c2", "continuous", 2, null),
		score("f2", "term_final", 2, 14),
	];
	const f = fixture(rows);
	const result = await f.detail();
	const course = result.subjects[0];
	assert.equal(course.continuousAvg, 10);
	assert.equal(course.finalAvg, 16);
	assert.equal(course.overallAvg, 15.14);
	assert.equal(course.annualScore, 15.14);
	assert.equal(course.isPassed, true);
	assert.equal(
		course.scores.find((entry) => entry.examId === "exam-f1")!.termNumber,
		1,
	);
	assert.equal(f.writes, 0, "opening detail must not modify stored grades");
	const synced = await f.sync();
	assert.equal(synced.gpa, course.overallAvg);
	assert.equal(synced.continuousGpa, course.continuousAvg);
	assert.equal(synced.finalGpa, course.finalAvg);
});

for (const count of [5, 10]) {
	test(`${count} modules: detail and sync honor weights, independently of module order`, async () => {
		const modules = Array.from({ length: count }, (_, i) => ({
			id: `m${i}`,
			weight: i === 0 ? 3 : 1,
		}));
		const course = subject(modules);
		const rows = modules.flatMap((module, i) => [
			score(`c${i}`, "modular_continuous", 1, 4, course, module.id),
			score(
				`f${i}`,
				"modular_competency",
				2,
				i === 0 ? 10 : 20,
				course,
				module.id,
			),
		]);
		const f = fixture(rows);
		const result = (await f.detail()).subjects[0];
		assert.equal(result.continuousAvg, 16);
		assert.equal(result.overallAvg, count === 5 ? 15.71 : 17.5);
		assert.equal(result.finalAvg, result.overallAvg);
		assert.equal(result.isPassed, true);
		assert.equal((await f.sync()).gpa, result.overallAvg);
	});
}

test("official annual score and result survive presentation changes and unit edits", async () => {
	const rows = [score("f", "term_final", 2, 10.2)];
	const courses = toGpaCourses(rows);
	courses[0].official = { score: 10.25, isPassed: true };
	const basis: GpaBasis = {
		version: 1,
		courses,
		summary: calculateGpa(courses),
	};
	rows[0].exam.title = "عنوان جدید";
	rows[0].exam.teachingAssignment.subject.defaultUnit = 4;
	const f = fixture(rows, basis);
	const result = (await f.detail()).subjects[0];
	assert.equal(result.overallAvg, 10.25);
	assert.equal(result.isPassed, true);
	assert.equal((await f.sync()).gpa, 10.25);
});

test("changed component grades invalidate the official score in both detail and sync", async () => {
	const rows = [score("f", "term_final", 2, 10.2)];
	const courses = toGpaCourses(rows);
	courses[0].official = { score: 10.25, isPassed: true };
	const basis: GpaBasis = {
		version: 1,
		courses,
		summary: calculateGpa(courses),
	};
	rows[0].isAbsent = true;
	const f = fixture(rows, basis);
	const result = (await f.detail()).subjects[0];
	assert.equal(result.overallAvg, 0);
	assert.equal(result.isPassed, false);
	assert.equal((await f.sync()).gpa, 0);
});

test("null grades remain unrecorded while an absence contributes zero", async () => {
	const row = score("f", "term_final", 2, null);
	const empty = (await fixture([row]).detail()).subjects[0];
	assert.equal(empty.overallAvg, null);
	assert.equal(empty.annualScore, null);
	assert.equal(empty.finalAvg, null);
	assert.equal(empty.isPassed, false);
	row.isAbsent = true;
	const absent = (await fixture([row]).detail()).subjects[0];
	assert.equal(absent.overallAvg, 0);
	assert.equal(absent.finalAvg, 0);
});

test("a missing competency grade prevents a pass without turning it into a zero grade", async () => {
	const course = subject([
		{ id: "m1", weight: 1 },
		{ id: "m2", weight: 3 },
	]);
	const rows = [
		score("f1", "modular_competency", 1, 10, course, "m1"),
		score("f2", "modular_competency", 2, null, course, "m2"),
	];
	const result = (await fixture(rows).detail()).subjects[0];
	assert.equal(result.overallAvg, 10);
	assert.equal(result.isPassed, false);
});

test("a module weight edit recomputes an imported score and respects zero weight", async () => {
	const course = subject([
		{ id: "m1", weight: 1 },
		{ id: "m2", weight: 1 },
	]);
	const rows = [
		score("f1", "modular_competency", 1, 10, course, "m1"),
		score("f2", "modular_competency", 2, 20, course, "m2"),
	];
	const courses = toGpaCourses(rows);
	courses[0].official = { score: 15.25, isPassed: true };
	const basis: GpaBasis = {
		version: 1,
		courses,
		summary: calculateGpa(courses),
	};
	course.subjectModules[0].weight = 0;
	const f = fixture(rows, basis);
	const result = (await f.detail()).subjects[0];
	assert.equal(result.overallAvg, 20);
	assert.equal((await f.sync()).gpa, 20);
});
