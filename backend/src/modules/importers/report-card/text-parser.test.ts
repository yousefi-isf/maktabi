import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseReportCardText } from "./text-parser.js";

const graphics = readFileSync(
	new URL("../../../../karname-2.txt", import.meta.url),
	"utf8",
);
const network = readFileSync(
	new URL("../../../../karname.txt", import.meta.url),
	"utf8",
);
const first = graphics.split(
	/(?=جمهوری اسلامی ایران\s+وزارت آموزش و پرورش)/,
)[1];

test("parses both project fixtures and preserves course and module scores", () => {
	const batch = parseReportCardText(graphics);
	assert.equal(batch.students.length, 15);
	assert.equal(batch.school.academicYear, "1404-1405");
	assert.equal(batch.school.fieldCode, "21140");
	assert.equal(batch.school.fieldTitle, "گرافیک");
	assert.equal(batch.students[0].courses[0].finalScore, 12);
	assert.deepEqual(batch.students[0].courses[0].t1Continuous, 16);
	assert.equal(batch.students[0].courses[1].result, "مردود");
	assert.equal(batch.students[0].summary.gpa, 13.09);
	assert.match(batch.students[0].student.birthDate!, /^\d{4}\/\d{2}\/\d{2}$/);
	const second = parseReportCardText(network);
	assert.equal(second.students.length, 15);
	assert.equal(second.school.fieldTitle, "شبکه و نرم‌افزار رایانه");
	assert.equal(
		second.students[0].courses.reduce(
			(count, course) => count + 1 + course.modules.length,
			0,
		),
		59,
	);
	assert.equal(
		second.students[0].courses.find((course) => course.code === "45265")
			?.modules.length,
		10,
	);
});

test("accepts Persian digits, Arabic letters, CRLF and spaces before colons", () => {
	const transformed = first
		.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])
		.replace(/:/g, " : ")
		.replace(/\n/g, "\r\n");
	assert.deepEqual(
		parseReportCardText(transformed),
		parseReportCardText(first),
	);
});

test("rejects empty, incomplete, duplicate and mixed batches", () => {
	assert.throws(() => parseReportCardText("   "), /متن کارنامه الزامی/);
	assert.throws(() => parseReportCardText("متن نامرتبط"), /شناسایی نشد/);
	assert.throws(
		() =>
			parseReportCardText(
				first.replace(/کد ملی:[^\n]*?تاریخ تولد:/, "تاریخ تولد:"),
			),
		/کارنامه 1/,
	);
	assert.throws(
		() =>
			parseReportCardText(
				first.replace("1404-1405", "").replace("1405 _ 1404", ""),
			),
		/سال تحصیلی/,
	);
	assert.throws(
		() => parseReportCardText(first.split("تعداد واحد درسی")[0]),
		/جمع‌بندی/,
	);
	assert.throws(() => parseReportCardText(first + first), /تکراری/);
	assert.throws(
		() => parseReportCardText(first + first.replace("پايه:دهم", "پايه:یازدهم")),
		/یک مدرسه/,
	);
});

test("rejects invalid scores while allowing differences in printed totals", () => {
	assert.throws(
		() => parseReportCardText(first.replace("\n12\n", "\n25\n")),
		/خارج از محدوده/,
	);
	assert.throws(
		() => parseReportCardText(first.replace("\n12\n", "\nabc\n")),
		/عدد/,
	);
	assert.equal(
		parseReportCardText(first.replace("536.75", "500.75")).students.length,
		1,
	);
});
