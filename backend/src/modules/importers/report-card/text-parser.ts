import { z } from "zod";
import { normalizeNationalCode } from "../../../lib/persian-utils.js";
import {
	reportCardBatchDtoSchema,
	type ReportCardCourseDto,
	type ReportCardSchoolDto,
} from "./dto.js";
import {
	normalizeReportCardText,
	parseReportCards,
} from "./text-report-parser.js";

export function parseReportCardText(raw: string) {
	const text = normalizeReportCardText(raw);
	if (!text.trim()) throw new Error("متن کارنامه الزامی است.");
	const blocks = text
		.split(/(?=جمهوری اسلامی ایران\s+وزارت آموزش و پرورش)/)
		.filter((block) => /(?:استان|کد دانش [اآ]موزی)\s*:/.test(block));
	if (!blocks.length)
		throw new Error(
			"کارنامه‌ای شناسایی نشد. متن کامل کارنامه را با حفظ جدول و سطرها جای‌گذاری کنید.",
		);

	let school: ReportCardSchoolDto | undefined;
	const codes = new Set<string>();
	const students = blocks.map((block, index) => {
		try {
			const report = parseReportCards(block)[0];
			if (!report) throw new Error("مشخصات دانش‌آموز یافت نشد.");
			const year = block.match(/\b(1[34]\d{2})\s*[-_]\s*(1[34]\d{2})\b/);
			if (!year) throw new Error("سال تحصیلی یافت نشد.");
			const years = [Number(year[1]), Number(year[2])].sort((a, b) => a - b);
			if (years[1] !== years[0] + 1) throw new Error("سال تحصیلی معتبر نیست.");
			const field = block.match(/در رشته\s+(\d+)\s*--\s*([^\n]+)/);
			const currentSchool: ReportCardSchoolDto = {
				name: report.school.schoolName,
				code: report.school.schoolCode,
				province: report.school.province,
				district: report.school.region,
				academicYear: years.join("-"),
				period:
					block.match(
						/(?:^|\n)\s*(ضمن سال|تابستانی|تابستان|دی ماه)\s*(?:\n|$)/,
					)?.[1] ?? "ضمن سال",
				gradeTitle: report.school.grade,
				fieldTitle:
					field?.[2].replace(/\s*با موفقیت.*$/, "").trim() ||
					report.school.field,
				fieldCode: field?.[1] ?? "نامشخص",
				schoolType: "technical",
			};
			if (
				school &&
				Object.keys(school).some(
					(key) =>
						school![key as keyof ReportCardSchoolDto] !==
						currentSchool[key as keyof ReportCardSchoolDto],
				)
			) {
				throw new Error(
					"تمام کارنامه‌ها باید متعلق به یک مدرسه، پایه، رشته، دوره و سال تحصیلی باشند.",
				);
			}
			school = currentSchool;
			if (!/^\d{1,10}$/.test(report.student.nationalId))
				throw new Error("کد ملی معتبر نیست.");
			const nationalCode = normalizeNationalCode(report.student.nationalId);
			if (codes.has(nationalCode))
				throw new Error("کارنامه تکراری برای یک کد ملی وارد شده است.");
			codes.add(nationalCode);
			if (!report.courses.length)
				throw new Error(
					"هیچ درسی شناسایی نشد. جدول متن باید با حفظ تب‌ها و سطرها کپی شود.",
				);
			if (report.warnings.some((warning) => warning.includes("به‌جای ۹")))
				throw new Error(
					"ستون‌های بعضی دروس ناقص است. متن کامل جدول را وارد کنید.",
				);
			if (report.warnings.some((warning) => warning.includes("پیدا نشد")))
				throw new Error(
					"جمع‌بندی واحدها و معدل یافت نشد. متن کامل کارنامه را وارد کنید.",
				);

			const courses: ReportCardCourseDto[] = [];
			for (const row of report.courses) {
				const failed = row.remarks.find((remark) =>
					/مردود|ناتمام|عدم احراز/.test(remark),
				);
				if (row.isModule) {
					const parent = courses.at(-1);
					if (!parent || parent.code !== row.parentCode)
						throw new Error(`درس مادر پودمان ${row.code} یافت نشد.`);
					const score = row.annualScore ?? row.finalScore;
					if (score === null)
						throw new Error(`نمره پودمان ${row.code} یافت نشد.`);
					const competency = row.competencyScore;
					const isPassed =
						score >= 10 && !failed && !competency?.includes("عدم احراز");
					parent.isModular = true;
					parent.modules.push({
						row: row.row,
						code: row.code,
						title: row.name,
						orderIndex: parent.modules.length + 1,
						moduleContinuous: row.moduleContinuousAssessmentScore,
						competencyScore: competency,
						competencyLevel: competency?.includes("عدم احراز")
							? "not_achieved"
							: competency?.includes("بالاتر")
								? "beyond_expectation"
								: competency
									? "achieved"
									: null,
						moduleFinalScore: score,
						isPassed: Boolean(isPassed),
						result: failed ?? (isPassed ? "قبول" : "مردود"),
					});
					if (!isPassed) {
						parent.isPassed = false;
						parent.result = "ناتمام";
					}
				} else {
					if (row.units === null || row.units <= 0)
						throw new Error(`تعداد واحد درس ${row.code} معتبر نیست.`);
					const score = row.finalScore ?? row.annualScore;
					if (score === null) throw new Error(`نمره درس ${row.code} یافت نشد.`);
					const isPassed = score >= 10 && !failed;
					courses.push({
						row: row.row,
						code: row.code,
						title: row.name,
						unit: row.units,
						isModular: false,
						t1Continuous: row.termColumns[0],
						t1Final: row.termColumns[1],
						t2Continuous: row.termColumns[2],
						t2Final: row.termColumns[3],
						annualScore: row.annualScore,
						finalScore: score,
						isPassed: Boolean(isPassed),
						result: failed ?? (isPassed ? "قبول" : "مردود"),
						modules: [],
					});
				}
			}
			if (!["پسر", "دختر", "مرد", "زن"].includes(report.student.gender))
				throw new Error("جنسیت دانش‌آموز معتبر نیست.");
			return {
				student: {
					firstName: report.student.firstName,
					lastName: report.student.lastName,
					fatherName: report.student.fatherName,
					nationalCode,
					studentNumber: report.student.studentId,
					gender: /دختر|زن/.test(report.student.gender)
						? ("female" as const)
						: ("male" as const),
					birthDate: report.student.birthDate.replace(
						/^(\d{4})(\d{2})(\d{2})$/,
						"$1/$2/$3",
					),
					birthPlace: report.student.birthPlace,
				},
				courses,
				summary: {
					totalUnitsTaken: report.summary.unitsTaken,
					totalUnitsPassed: report.summary.unitsPassed,
					totalScoreSum: report.summary.totalScore,
					gpa: report.summary.gpa,
					printDate: block.match(/تاریخ چاپ\s*:\s*([\d/]+)/)?.[1] ?? null,
				},
			};
		} catch (error) {
			const detail =
				error instanceof z.ZodError
					? "مشخصات ضروری یا نمرات کارنامه ناقص یا نامعتبر است."
					: error instanceof Error
						? error.message
						: "متن کارنامه معتبر نیست.";
			throw new Error(`کارنامه ${index + 1}: ${detail}`);
		}
	});
	const result = reportCardBatchDtoSchema.safeParse({ school, students });
	if (!result.success) {
		const index = result.error.issues[0]?.path[1];
		throw new Error(
			`${typeof index === "number" ? `کارنامه ${index + 1}: ` : ""}مشخصات ضروری یا نمرات کارنامه ناقص یا خارج از محدوده مجاز است.`,
			{ cause: result.error },
		);
	}
	return result.data;
}
