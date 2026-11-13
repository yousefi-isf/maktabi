import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseReportCardText } from "../importers/report-card/text-parser.js";
import {
	calculateCourse,
	calculateGpa,
	roundGrade,
	type GpaBasis,
	type GpaCourse,
} from "./gpa-calculation.js";

function theoretical(id: string, unit: number, grade: number): GpaCourse {
	return {
		id,
		unit,
		isModular: false,
		modules: [],
		scores: [1, 2].flatMap((term) =>
			["continuous", "term_final"].map((type) => ({
				id: `${id}-${type}-${term}`,
				type,
				term,
				moduleId: null,
				value: grade,
				isAbsent: false,
			})),
		),
	};
}

function modular(
	count: number,
	unit = 2,
	continuous = 4,
	final = 15,
): GpaCourse {
	return {
		id: `modular-${count}`,
		unit,
		isModular: true,
		modules: Array.from({ length: count }, (_, index) => ({
			id: String(index),
			weight: 1,
		})),
		scores: Array.from({ length: count }, (_, index) => [
			{
				id: `c-${index}`,
				moduleId: String(index),
				type: "modular_continuous",
				value: continuous,
				term: 1,
				isAbsent: false,
			},
			{
				id: `f-${index}`,
				moduleId: String(index),
				type: "modular_competency",
				value: final,
				term: 1,
				isAbsent: false,
			},
		]).flat(),
	};
}

function basisFor(courses: GpaCourse[]): GpaBasis {
	return {
		version: 1,
		courses: structuredClone(courses),
		summary: calculateGpa(courses),
	};
}

test("unchanged official results are retained exactly, including zero GPA and footer rounding", () => {
	const courses = [theoretical("a", 2, 15), modular(10)];
	const basis = basisFor(courses);
	basis.summary = {
		gpa: 0,
		continuousGpa: 14.13,
		finalGpa: 15.29,
		totalScoreSum: 61.25,
		totalUnitsPassed: 3,
		totalUnitsTaken: 4,
	};
	for (let i = 0; i < 5; i++)
		assert.deepEqual(calculateGpa(courses, basis), basis.summary);
	assert.deepEqual(
		calculateGpa(
			[...courses].reverse().map((course) => ({
				...course,
				modules: [...course.modules].reverse(),
				scores: [...course.scores].reverse(),
			})),
			basis,
		),
		basis.summary,
	);
	// PostgreSQL JSONB returns object keys in a different order from insertion.
	const reorderKeys = (entry: unknown): unknown =>
		Array.isArray(entry)
			? entry.map(reorderKeys)
			: entry && typeof entry === "object"
				? Object.fromEntries(
						Object.entries(entry)
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([key, value]) => [key, reorderKeys(value)]),
					)
				: entry;
	assert.deepEqual(
		calculateGpa(courses, reorderKeys(basis) as GpaBasis),
		basis.summary,
	);
});

test("unit changes reweight every GPA and restoring units restores the exact original result", () => {
	const courses = [theoretical("a", 2, 10), theoretical("b", 2, 20)];
	const basis = basisFor(courses);
	const changed = [courses[0], { ...courses[1], unit: 4 }];
	const result = calculateGpa(changed, basis);
	assert.equal(result.gpa, 16.67);
	assert.equal(result.continuousGpa, 16.67);
	assert.equal(result.finalGpa, 16.67);
	assert.equal(result.totalScoreSum, 100);
	assert.equal(result.totalUnitsTaken, 6);
	assert.equal(result.totalUnitsPassed, 6);
	assert.deepEqual(calculateGpa(changed, basis), result);
	assert.deepEqual(calculateGpa(courses, basis), basis.summary);
});

test("official per-course results and pass status survive a unit change", () => {
	const course = theoretical("a", 2, 10);
	course.official = { score: 10.25, isPassed: true };
	const basis = basisFor([course]);
	const result = calculateGpa([{ ...course, unit: 4 }], basis);
	assert.equal(result.gpa, 10.25);
	assert.equal(result.totalScoreSum, 41);
	assert.equal(result.totalUnitsPassed, 4);
});

test("five and ten modules have the same course weight", () => {
	for (const count of [5, 10]) {
		const result = calculateGpa([theoretical("a", 2, 20), modular(count)]);
		assert.equal(result.continuousGpa, 18);
		assert.equal(result.finalGpa, 17.5);
		assert.equal(result.gpa, 17.5);
		assert.equal(result.totalUnitsTaken, 4);
	}
});

test("module weights work by module identity, with zero weights and missing/null scores", () => {
	const course = modular(2);
	course.scores.find((score) => score.id === "f-0")!.value = 10;
	course.scores.find((score) => score.id === "f-1")!.value = 20;
	const basis = basisFor([course]);
	const changed = {
		...course,
		modules: [
			{ id: "0", weight: 1 },
			{ id: "1", weight: 3 },
		],
	};
	assert.equal(calculateGpa([changed], basis).finalGpa, 17.5);
	changed.modules[0].weight = 0;
	assert.equal(calculateGpa([changed], basis).finalGpa, 20);
	course.scores.find((score) => score.id === "f-0")!.value = null;
	assert.equal(calculateCourse(course).isPassed, false);
	assert.equal(calculateCourse(course).final, 20);
});

test("a changed raw score invalidates the official result, absence counts as zero", () => {
	const course = theoretical("a", 2, 20);
	course.official = { score: 20, isPassed: true };
	const basis = basisFor([course]);
	const changed = structuredClone(course);
	changed.scores.find(
		(score) => score.type === "term_final" && score.term === 2,
	)!.isAbsent = true;
	const result = calculateGpa([changed], basis);
	assert.equal(result.gpa, 10);
	assert.equal(result.totalUnitsPassed, 0);
	assert.deepEqual(calculateGpa([course], basis), basis.summary);
});

test("missing continuous grades are excluded from the annual denominator", () => {
	const course = theoretical("sport", 2, 20);
	course.scores = course.scores.filter((score) => score.type === "term_final");
	assert.equal(calculateCourse(course).overall, 20);
	assert.equal(calculateCourse(course).continuous, null);
	assert.equal(calculateCourse(course).isPassed, true);
});

for (const file of ["karname.txt", "karname-2.txt"]) {
	test(`${file}: all imported summaries survive repeated syncs and unit round trips`, () => {
		const batch = parseReportCardText(
			readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8"),
		);
		for (const student of batch.students) {
			const courses: GpaCourse[] = student.courses.map((course) => {
				const result = theoretical(course.code, course.unit, 0);
				result.isModular = course.isModular;
				result.official = {
					score: course.finalScore,
					isPassed: course.isPassed,
				};
				result.modules = course.modules.map((module) => ({
					id: module.code,
					weight: 1,
				}));
				result.scores = course.isModular
					? course.modules.flatMap((module) => [
							{
								id: `${module.code}-c`,
								type: "modular_continuous",
								term: 1,
								moduleId: module.code,
								value: module.moduleContinuous,
								isAbsent: false,
							},
							{
								id: `${module.code}-f`,
								type: "modular_competency",
								term: 1,
								moduleId: module.code,
								value: module.moduleFinalScore,
								isAbsent: false,
							},
						])
					: result.scores
							.map((score) => ({
								...score,
								value:
									(score.term === 1
										? score.type === "continuous"
											? course.t1Continuous
											: course.t1Final
										: score.type === "continuous"
											? course.t2Continuous
											: course.t2Final) ?? null,
							}))
							.filter((score) => score.value !== null);
				return result;
			});
			const basis = basisFor(courses);
			basis.summary = { ...basis.summary, ...student.summary };
			assert.deepEqual(calculateGpa(courses, basis), basis.summary);
			const changed = courses.map((course, i) => ({
				...course,
				unit: course.unit + (i === 0 ? 1 : 0),
			}));
			const result = calculateGpa(changed, basis);
			assert.equal(
				result.totalScoreSum,
				roundGrade(student.summary.totalScoreSum + courses[0].official!.score),
			);
			assert.equal(result.totalUnitsTaken, student.summary.totalUnitsTaken + 1);
			assert.deepEqual(calculateGpa(changed, basis), result);
			assert.deepEqual(calculateGpa(courses, basis), basis.summary);
		}
	});
}
