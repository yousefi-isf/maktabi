import { areModulesPassed } from "./modular-result.js";

export interface GpaCourse {
	id: string;
	unit: number;
	isModular: boolean;
	modules: { id: string; weight: number }[];
	scores: {
		id: string;
		type: string;
		term: number;
		moduleId: string | null;
		value: number | null;
		isAbsent: boolean;
	}[];
	official?: { score: number; isPassed: boolean };
}

export interface GpaSummary {
	gpa: number;
	continuousGpa: number;
	finalGpa: number;
	totalUnitsPassed: number;
	totalUnitsTaken: number;
	totalScoreSum: number;
}

export interface GpaBasis {
	version: 1;
	courses: GpaCourse[];
	summary: GpaSummary;
}

export const roundGrade = (value: number) =>
	Math.round((value + Number.EPSILON) * 100) / 100;

// Titles and module order are presentation details, not calculation inputs.
function gradeKey(course: GpaCourse) {
	return JSON.stringify({
		modular: course.isModular,
		modules: [...course.modules]
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((module) => [module.id, module.weight]),
		scores: [...course.scores]
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((score) => [
				score.id,
				score.type,
				score.term,
				score.moduleId,
				score.value,
				score.isAbsent,
			]),
	});
}

function average(values: { value: number | null; weight: number }[]) {
	const present = values.filter((entry) => entry.value !== null);
	const weight = present.reduce((sum, entry) => sum + entry.weight, 0);
	return weight
		? present.reduce((sum, entry) => sum + entry.value! * entry.weight, 0) /
				weight
		: null;
}

export function calculateCourse(course: GpaCourse, original?: GpaCourse) {
	const value = (score: GpaCourse["scores"][number] | undefined) =>
		score?.isAbsent ? 0 : (score?.value ?? null);
	let continuous: number | null;
	let final: number | null;
	let overall: number | null;
	let isPassed: boolean;

	if (course.isModular) {
		const moduleScores = (type: string, scale: number) =>
			course.modules.map((module) => ({
				value: (() => {
					const result = value(
						course.scores.find(
							(score) => score.moduleId === module.id && score.type === type,
						),
					);
					return result === null ? null : result * scale;
				})(),
				weight: module.weight,
			}));
		continuous = average(moduleScores("modular_continuous", 4));
		final = average(moduleScores("modular_competency", 1));
		overall = final;
		isPassed = areModulesPassed(
			course.modules.map((module) => module.id),
			course.scores
				.filter((score) => score.type === "modular_competency")
				.map((score) => ({
					moduleId: score.moduleId,
					score: score.value,
					isAbsent: score.isAbsent,
				})),
		);
	} else {
		const get = (type: string, term: number) =>
			value(
				course.scores.find(
					(score) => score.type === type && score.term === term,
				),
			);
		const c1 = get("continuous", 1),
			c2 = get("continuous", 2);
		const f1 = get("term_final", 1),
			f2 = get("term_final", 2);
		continuous = average([
			{ value: c1, weight: 1 },
			{ value: c2, weight: 1 },
		]);
		final = average([
			{ value: f1, weight: 1 },
			{ value: f2, weight: 2 },
		]);
		overall = average([
			{ value: c1, weight: 1 },
			{ value: f1, weight: 2 },
			{ value: c2, weight: 1 },
			{ value: f2, weight: 4 },
		]);
		isPassed = (overall ?? 0) >= 10 && (f2 ?? f1 ?? 0) >= 10;
	}

	// Printed annual scores may use official rounding or rules not represented by
	// component Score rows. A unit edit must keep those scores and pass results.
	const official = original
		? gradeKey(course) === gradeKey(original)
			? original.official
			: undefined
		: course.official;
	return {
		continuous,
		final,
		overall: official?.score ?? overall,
		isPassed: official?.isPassed ?? isPassed,
	};
}

function aggregate(courses: GpaCourse[], originals: GpaCourse[] = []) {
	const result = {
		continuousSum: 0,
		continuousWeight: 0,
		finalSum: 0,
		finalWeight: 0,
		sum: 0,
		units: 0,
		passed: 0,
	};
	const originalMap = new Map(originals.map((course) => [course.id, course]));
	for (const course of courses) {
		const grade = calculateCourse(course, originalMap.get(course.id));
		if (grade.continuous !== null) {
			result.continuousSum += grade.continuous * course.unit;
			result.continuousWeight += course.unit;
		}
		if (grade.final !== null) {
			result.finalSum += grade.final * course.unit;
			result.finalWeight += course.unit;
		}
		if (grade.overall !== null) result.sum += grade.overall * course.unit;
		result.units += course.unit;
		if (grade.isPassed) result.passed += course.unit;
	}
	return result;
}

export function calculateGpa(
	courses: GpaCourse[],
	basis?: GpaBasis,
): GpaSummary {
	const current = aggregate(courses, basis?.courses);
	if (!basis)
		return {
			gpa: roundGrade(current.units ? current.sum / current.units : 0),
			continuousGpa: roundGrade(
				current.continuousWeight
					? current.continuousSum / current.continuousWeight
					: 0,
			),
			finalGpa: roundGrade(
				current.finalWeight ? current.finalSum / current.finalWeight : 0,
			),
			totalUnitsPassed: roundGrade(current.passed),
			totalUnitsTaken: roundGrade(current.units),
			totalScoreSum: roundGrade(current.sum),
		};

	const originalMap = new Map(
		basis.courses.map((course) => [course.id, course]),
	);
	if (
		courses.length === basis.courses.length &&
		courses.every((course) => {
			const original = originalMap.get(course.id);
			return (
				original &&
				course.unit === original.unit &&
				gradeKey(course) === gradeKey(original)
			);
		})
	)
		return { ...basis.summary };

	const before = aggregate(basis.courses);
	// Preserve any difference between the official footer and its reconstructed
	// components; only actual input changes should affect an imported result.
	const totalScoreSum = roundGrade(
		basis.summary.totalScoreSum + current.sum - before.sum,
	);
	const totalUnitsTaken = roundGrade(
		basis.summary.totalUnitsTaken + current.units - before.units,
	);
	const componentGpa = (
		sum: number,
		weight: number,
		oldSum: number,
		oldWeight: number,
		official: number,
	) => {
		if (!weight) return 0;
		const adjustment =
			roundGrade(oldWeight ? oldSum / oldWeight : 0) === official
				? 0
				: official * oldWeight - oldSum;
		return roundGrade((sum + adjustment) / weight);
	};
	return {
		gpa:
			totalScoreSum === basis.summary.totalScoreSum &&
			totalUnitsTaken === basis.summary.totalUnitsTaken
				? basis.summary.gpa
				: roundGrade(totalUnitsTaken ? totalScoreSum / totalUnitsTaken : 0),
		continuousGpa: componentGpa(
			current.continuousSum,
			current.continuousWeight,
			before.continuousSum,
			before.continuousWeight,
			basis.summary.continuousGpa,
		),
		finalGpa: componentGpa(
			current.finalSum,
			current.finalWeight,
			before.finalSum,
			before.finalWeight,
			basis.summary.finalGpa,
		),
		totalUnitsPassed: roundGrade(
			basis.summary.totalUnitsPassed + current.passed - before.passed,
		),
		totalUnitsTaken,
		totalScoreSum,
	};
}
