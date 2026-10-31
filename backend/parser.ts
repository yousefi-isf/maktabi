import { z } from "zod";

/* ――――――――――――――――――――――――――――――――― Schemas ―――――――――――――――――――――――――――――――― */

const CourseSchema = z.object({
    row: z.number().int(),
    code: z.string(),
    name: z.string(),
    isModule: z.boolean(),
    parentCode: z.string().nullable(),
    units: z.number().nullable(),
    finalScore: z.number().nullable(),
    termColumns: z.array(z.number().nullable()).length(4), // result : [نوبت اول - مستمر , نوبت اول - پایانی , نوبت دوم - مستمر , نوبت دوم - پایانی]
    moduleContinuousAssessmentScore: z.number().nullable(), // نمره مستمر پودمان
    competencyScore: z.string().nullable(), // نمره شایستگی
    annualScore: z.number().nullable(),
    remarks: z.array(z.string()),                          // ناتمام، مردود، ...
});

const StudentSchema = z.object({
    school: z.object({
        province: z.string(), region: z.string(), schoolCode: z.string(),
        grade: z.string(), field: z.string(), schoolName: z.string(),
    }),
    student: z.object({
        firstName: z.string(), lastName: z.string(), fatherName: z.string(),
        studentId: z.string(), nationalId: z.string(), gender: z.string(),
        birthDate: z.string(), birthPlace: z.string(),
    }),
    courses: z.array(CourseSchema),
    summary: z.object({
        unitsTaken: z.number(), unitsPassed: z.number(),
        totalScore: z.number(), gpa: z.number(),
    }),
    warnings: z.array(z.string()),
});

export type StudentReport = z.infer<typeof StudentSchema>;

const normalize = (s: string) =>
    s
        .replace(/\r/g, "")
        .replace(/[\u200B\u200E\u200F\u202A-\u202E\uFEFF]/g, "")
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/* ―――――――――――――――――――――――――――――――――― Keys ―――――――――――――――――――――――――――――――――― */
const SCHOOL_KEYS = ["استان", "منطقه", "کد", "پایه", "نوع مدرسه", "نوع واحد", "رشته", "مدرسه"];
const STUDENT_KEYS = [
    "نام خانوادگی", "نام پدر", "کد دانش اموزی", "جنسیت",
    "کد ملی", "تاریخ تولد", "محل تولد", "نام",
];

// "کلید:مقدارکلید2:مقدار2" -> { کلید: مقدار, ... }
function parseKeyValues(line: string | undefined, keys: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    if (!line) return out;
    const matches = [...line.matchAll(new RegExp(`(${keys.join("|")}):`, "g"))];
    matches.forEach((m, i) => {
        const start = m.index! + m[0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index! : line.length;
        out[m[1]] = line.slice(start, end).trim();
    });
    return out;
}

const isDash = (t?: string) => t === undefined || /^-+$/.test(t);
const num = (t?: string) => (isDash(t) || !Number.isFinite(Number(t)) ? null : Number(t));
const txt = (t?: string) => (isDash(t) ? null : t!);

const ROW_RE = /^(\d{1,3})\t(\d{2,})\t(.*?)\s*$/;
const TOTALS_RE = /اخذ شده\s+قبولی\s+این سال\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)/;

function parseBlock(block: string): StudentReport {
    const warnings: string[] = [];
    const lines = block.split("\n");

    const sc = parseKeyValues(lines.find((l) => l.includes("استان:")), SCHOOL_KEYS);
    const st = parseKeyValues(lines.find((l) => l.includes("کد دانش اموزی:")), STUDENT_KEYS);

    // جمع‌آوری ردیف‌ها: هر خط غیرخالی بعد از خط ردیف، یک مقدار آن ردیف است
    type RawRow = { row: string; code: string; name: string; tokens: string[] };
    const rows: RawRow[] = [];
    let cur: RawRow | null = null;
    for (const line of lines) {
        const m = line.match(ROW_RE);
        if (m) {
            cur = { row: m[1], code: m[2], name: m[3], tokens: [] };
            rows.push(cur);
            continue;
        }
        if (line.includes("تعداد واحد درسی")) { cur = null; continue; }
        const t = line.trim();
        if (cur && t) cur.tokens.push(t);
    }

    let parent: string | null = null;
    const courses = rows.map((r) => {
        if (r.tokens.length < 9) warnings.push(`ردیف ${r.row} (${r.code}): ${r.tokens.length} مقدار به‌جای ۹`);
        const [units, finalScore, a, b, c, d, lvl, res, annual, ...remarks] = r.tokens;
        const isModule = r.name.startsWith("--");
        if (!isModule) parent = r.code;
        return {
            row: Number(r.row),
            code: r.code,
            name: r.name.replace(/^--/, "").trim(),
            isModule,
            parentCode: isModule ? parent : null,
            units: num(units),
            finalScore: num(finalScore),
            termColumns: [a, b, c, d].map(num),
            moduleContinuousAssessmentScore: num(lvl),
            competencyScore: txt(res),
            annualScore: num(annual),
            remarks,
        };
    });

    const t = block.match(TOTALS_RE);
    if (!t) warnings.push("خط جمع‌بندی (واحد/جمع نمرات/معدل) پیدا نشد");
    const [unitsTaken, unitsPassed, totalScore, gpa] = t ? t.slice(1).map(Number) : [0, 0, 0, 0];

    // اعتبارسنجی متقاطع
    const top = courses.filter((c) => !c.isModule);
    const sumUnits = top.reduce((s, c) => s + (c.units ?? 0), 0);
    const sumScore = top.reduce((s, c) => s + (c.units ?? 0) * (c.finalScore ?? 0), 0);
    if (t) {
        if (sumUnits !== unitsTaken) warnings.push(`جمع واحدها ${sumUnits} است، چاپ‌شده ${unitsTaken}`);
        if (Math.abs(sumScore - totalScore) > 0.01) warnings.push(`جمع نمرات محاسبه‌شده ${sumScore}، چاپ‌شده ${totalScore}`);
        if (Math.abs(totalScore / unitsTaken - gpa) > 0.01) warnings.push("معدل با جمع نمرات/واحد نمی‌خواند");
    }

    console.log(sc)
    return StudentSchema.parse({
        school: {
            province: sc["استان"], region: sc["منطقه"], schoolCode: sc["کد"],
            grade: sc["پایه"], field: sc["رشته"], schoolName: sc["مدرسه"],
        },
        student: {
            firstName: st["نام"], lastName: st["نام خانوادگی"], fatherName: st["نام پدر"],
            studentId: st["کد دانش اموزی"], nationalId: st["کد ملی"], gender: st["جنسیت"],
            birthDate: st["تاریخ تولد"], birthPlace: st["محل تولد"],
        },
        courses,
        summary: {
            unitsTaken, unitsPassed, totalScore, gpa,
        },
        warnings,
    });
}

export function parseReportCards(raw: string): StudentReport[] {
    return normalize(raw)
        .split(/(?=جمهوری اسلامی ایران\s+وزارت آموزش و پرورش)/)
        .map((b) => b.split("ازابتدا")[0])      // نویز بعد از «ازابتدا» حذف می‌شود
        .filter((b) => b.includes("کد دانش اموزی:"))
        .map(parseBlock);
}


import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";

const reports = parseReportCards(await readFile("karname-2.txt", "utf8"));

writeFileSync("output.txt", JSON.stringify(reports, null, 2), "utf8");