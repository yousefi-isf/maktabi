import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseReportCardText } from "../importers/report-card/text-parser.js";
import { areModulesPassed } from "./modular-result.js";

const batch = parseReportCardText(
	readFileSync(new URL("../../../karname.txt", import.meta.url), "utf8"),
);

test("both ten-module courses retain the parsed result for all students, including Mahyar", () => {
	assert.equal(batch.students[0].student.firstName, "مهیار");
	assert.equal(batch.students[0].student.lastName, "ترکیان");
	for (const student of batch.students) {
		for (const code of ["45265", "45266"]) {
			const course = student.courses.find((course) => course.code === code)!;
			assert.equal(course.modules.length, 10);
			assert.equal(course.isPassed, true);
			assert.equal(
				areModulesPassed(
					course.modules.map((module) => module.code),
					course.modules.map((module) => ({
						moduleId: module.code,
						score: module.moduleFinalScore,
						isAbsent: false,
					})),
				),
				true,
				`${student.student.firstName}: ${code}`,
			);
		}
	}
});

for (const count of [5, 10]) {
	test(`${count} modules require every defined module to have a passing score`, () => {
		const ids = Array.from({ length: count }, (_, i) => String(i));
		const scores = ids.map((moduleId) => ({
			moduleId,
			score: 10 as number | null,
			isAbsent: false,
		}));
		assert.equal(areModulesPassed(ids, scores), true);
		assert.equal(areModulesPassed(ids, scores.slice(1)), false);
		assert.equal(areModulesPassed(ids, [...scores.slice(1), scores[1]]), false);
		for (const change of [
			{ score: 9.75 },
			{ score: null },
			{ isAbsent: true },
		]) {
			assert.equal(
				areModulesPassed(ids, [
					{ ...scores[0], ...change },
					...scores.slice(1),
				]),
				false,
			);
		}
	});
}

test("an undefined module or no defined modules cannot establish a pass", () => {
	assert.equal(areModulesPassed([], []), false);
	assert.equal(
		areModulesPassed(["1"], [{ moduleId: null, score: 20, isAbsent: false }]),
		false,
	);
});
