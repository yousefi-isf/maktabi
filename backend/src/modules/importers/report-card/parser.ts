import { getDocumentProxy } from "unpdf";
import {
  toEnglishDigits,
  normalizePersianText,
  parseGradeScore,
  normalizeNationalCode,
} from "../../../lib/persian-utils.js";
import {
  reportCardBatchDtoSchema,
  singleReportCardDtoSchema,
  type ReportCardBatchDto,
  type SingleReportCardDto,
  type ReportCardSchoolDto,
  type ReportCardStudentDto,
  type ReportCardCourseDto,
  type ReportCardModuleDto,
  type ReportCardSummaryDto,
} from "./dto.js";
function debugRowGaps(items: PdfTextItem[]) {
  const sorted = [...items].sort((a, b) => b.x - a.x);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gap = (prev.x - prev.width) - cur.x;
    console.log(`"${prev.str}" -> "${cur.str}" | gap = ${gap}`);
  }
}
function debugBoxGaps(items: PdfTextItem[], minX: number, maxX: number) {
  const inBox = items.filter((i) => i.x >= minX && i.x <= maxX);
  const sorted = [...inBox].sort((a, b) => b.x - a.x);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevLeftEdge = prev.x - prev.width; // لبه‌ی چپ (پایانی) حرف قبلی چون RTL
    const gap = prevLeftEdge - cur.x;
    console.log(
      `"${prev.str}"(x=${prev.x}, w=${prev.width.toFixed(2)}) -> "${cur.str}"(x=${cur.x}) | gap = ${gap.toFixed(2)}`
    );
  }
}
// Comprehensive FastReport / Sida glyph dictionary
const GLYPH_MAP: Record<string, string> = {
  "︀": "ا", "ا": "ا", "آ": "آ", "︋": "ب", "︊": "ب", "︉": "ب", "ب": "ب", "︎": "پ", "پ": "پ", "︑": "ت",
  "︐": "ت", "ت": "ت", "︒": "ث", "︔": "ث", "ث": "ث", "︖": "ج", "ج": "ج", "︗": "ج", "چ": "چ", "︚": "چ",
  "︝": "ح", "︜": "ح", "︛": "ح", "ح": "ح", "︠": "خ", "︟": "خ", "خ": "خ", "︡": "د", "د": "د", "︤": "ذ", "︢": "ذ",
  "ذ": "ذ", "︣": "ر", "ر": "ر", "︥": "ز", "ز": "ز", "︦": "س", "ژ": "ژ", "︧": "س", "︨": "س", "︩": "س", "س": "س",
  "︪": "ش", "︫": "ش", "ش": "ش", "︮": "ص", "︭": "ص", "ص": "ص", "︯": "ض", "︲": "ض", "︱": "ض", "ض": "ض",
  "ط": "ط", "︵": "ط", "︳": "ط", "︴": "ط", "ظ": "ظ", "︺": "ع", "︻": "ع", "ع": "ع", "غ": "غ", "︽": "غ", "︾": "غ",
  "﹀": "ف", "﹁": "ف", "︿": "ف", "ف": "ف", "﹇": "ق", "﹆": "ق", "ق": "ق", "﹋": "ک", "ک": "ک", "﹊": "ک",
  "﹎": "گ", "گ": "گ", "ل": "ل", "﹚": "ل", "﹏": "ل", "﹛": "ل", "﹑": "ل", "﹝": "م", "﹞": "م", "﹜": "م", "م": "م",
  "﹡": "ن", "﹟": "ن", "﹠": "ن", "ن": "ن", "﹢": "و", "و": "و", "﹨": "ه", "﹧": "ه", "﹤": "ه",
  "ه": "ه", "﹩": "ی", "﹫": "ی", "﹬": "ی", "﹪": "ی", "ي": "ی", "ی": "ی", "ئ": "ئ", "ء": "ء",
  "﹯": "ئ", "﹣": "ؤ",
  "ت︀": "تا", "ن︀": "نا", "د︀": "دا", "م︀": "ما", "ر︀": "را", "وا": "وا", "اد": "اد", "رد": "رد",
  "درس": "درس", "اول": "اول", "دوم": "دوم", "دوره": "دوره", "اداره": "اداره", "وزارت": "وزارت",
  "(": ")", ")": "(", ":": ":", "-": "-", "،": "،", "؛": "؛", "اف": "اف", "لا": "لا"
};

function cleanPersonName(name: string): string {
  if (!name) return "";
  let cleaned = name
    .replace(/^نام\s*خانوادگی:?/, "")
    .replace(/^خانوادگی:?/, "")
    .replace(/^ادگی:?/, "")
    .replace(/^ن\s*ادگی:?/, "")
    .replace(/^نام:?/, "")
    .replace(/:/g, "")
    .trim();

  return cleaned;
}

function decodeBox(items: { str: string; x: number }[], minX: number, maxX: number): string {
  const inBox = items.filter((i) => i.x >= minX && i.x <= maxX);
  // Sort descending by X (Right-to-Left)
  inBox.sort((a, b) => b.x - a.x);
  const mapped = inBox.map((it) => {
    const chars = Array.from(it.str);
    return chars.map((ch) => GLYPH_MAP[ch] || ch).join("");
  });
  return normalizePersianText(mapped.join(""));
}

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

async function extractPageItems(doc: any, pageNum: number): Promise<PdfTextItem[]> {
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const items: PdfTextItem[] = [];
  for (const item of content.items) {
    if ("str" in item && item.str.trim()) {
      const raw = item as any;
      items.push({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: typeof raw.width === "number" ? raw.width : 0,
      });
    }
  }
  return items;
}

function groupRows(items: PdfTextItem[], tolerance = 4): { y: number; items: PdfTextItem[] }[] {
  const rows: { y: number; items: PdfTextItem[] }[] = [];
  const sorted = [...items].sort((a, b) => b.y - a.y);
  for (const item of sorted) {
    const existing = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
    if (existing) existing.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  for (const r of rows) {
    r.items.sort((a, b) => b.x - a.x);
  }
  return rows.sort((a, b) => b.y - a.y);
}

function getItemInBox(items: PdfTextItem[], minX: number, maxX: number): PdfTextItem | undefined {
  return items.find((it) => it.x >= minX && it.x <= maxX && it.str.trim() !== "");
}

/**
 * Parses school metadata and field of study dynamically from Page 1 & Page 2.
 */
function parseSchoolData(p1Items: PdfTextItem[], p2Items?: PdfTextItem[]): ReportCardSchoolDto {
  let schoolCode = "00000000";
  let fieldCode = "00000";
  let academicYear = "1400-1401";

  const allItems = [...p1Items, ...(p2Items || [])];
  for (const it of allItems) {
    const digits = toEnglishDigits(it.str);
    if (/^\d{8}$/.test(digits) && (digits.startsWith("96") || digits.startsWith("10") || digits.startsWith("11"))) {
      schoolCode = digits;
    }
    // Field code: 5-digit code
    if (/^\d{5}$/.test(digits) && !digits.startsWith("13")) {
      fieldCode = digits;
    }
    if (/^140\d-140\d$/.test(digits)) {
      academicYear = digits;
    }
  }

  // Province & District (Y ≈ 1166)
  const row1166Items = p1Items.filter((i) => i.y >= 1160 && i.y <= 1175);
  let province = decodeBox(row1166Items, 550, 680).replace(/^استان:?\s*/, "").trim() || "اصفهان";
  let district = decodeBox(row1166Items, 400, 560).replace(/^منطقه:?\s*/, "").trim() || "اداره ناحیه 5";

  // Field Title & School Name (Y ≈ 1118)
  const row1118Items = p1Items.filter((i) => i.y >= 1110 && i.y <= 1125);
  let fieldTitle = decodeBox(row1118Items, 550, 680).replace(/^رشته:?\s*/, "").trim();
  let schoolName = decodeBox(row1118Items, 400, 560).replace(/^مدرسه:?\s*/, "").trim();

  // Fix common missing spaces in extracted text
  // schoolName = schoolName.replace(/حاجحسین/, "حاج حسین ").replace(/صرامی/, "صرامی");
  // district = district.replace(/ادارهناحیه/, "اداره ناحیه ");
  // province = province.replace(/اصفهان/, "اصفهان");
  // if (fieldTitle === "شبکهونرمافزاررایانه") fieldTitle = "شبکه و نرم افزار رایانه";

  // // If decoding somehow missed the field title but we have the code
  // if (!fieldTitle) {
  //   if (fieldCode === "35091") fieldTitle = "حسابداری";
  //   else if (fieldCode === "35101") fieldTitle = "شبکه و نرم‌افزار رایانه";
  //   else fieldTitle = "نامشخص";
  // }

  // Grade Title - پایه (Y ≈ 1150, alongside school code)
  // "کد:96084101  پایه:دهم  نام پدر:..."
  // "دهم" = د(X=487) ه(X=482) م(X=476) → X in [474, 490]
  const row1150Items = p1Items.filter((i) => i.y >= 1144 && i.y <= 1157);
  let gradeTitle = decodeBox(row1150Items, 474, 492).replace(/^پایه:?\s*/, "").trim();
  // if (!gradeTitle) gradeTitle = "دهم"; // fallback

  if (!schoolName) schoolName = "نامشخص";

  return {
    name: schoolName,
    code: schoolCode,
    province,
    district,
    academicYear,
    period: "ضمن سال",
    gradeTitle,
    fieldTitle,
    fieldCode,
    schoolType: "technical",
  };
}

/**
 * Parses individual student identity from Page 1 header.
 */
function parseStudentData(p1Items: PdfTextItem[]): ReportCardStudentDto {
  let nationalCode = "";
  let studentNumber = "";
  let birthDateRaw = "";

  for (const it of p1Items.filter((i) => i.y > 1100)) {
    const digits = toEnglishDigits(it.str);
    if (/^\d{9,10}$/.test(digits) && !digits.startsWith("96")) {
      nationalCode = normalizeNationalCode(digits);
      studentNumber = digits;
    }
    if (/^13\d{6}$/.test(digits)) {
      birthDateRaw = digits;
    }
  }

  // Name row Y ≈ 1166
  // Label 'نام خانوادگی:' spans x in [220, 267].
  // Student firstName is strictly x in [268, 378] (label 'نام:' is at x >= 381).
  // Student lastName is strictly x in [80, 218] (to the left of 'نام خانوادگی:').
  const nameItems = p1Items.filter((i) => i.y >= 1160 && i.y <= 1175);
  // debugBoxGaps(nameItems, 80, 218);
  let firstName = cleanPersonName(decodeBox(nameItems, 268, 378));
  let lastName = cleanPersonName(decodeBox(nameItems, 80, 218));

  // Father row Y ≈ 1150
  const fatherItems = p1Items.filter((i) => i.y >= 1145 && i.y <= 1155);
  let fatherName = cleanPersonName(decodeBox(fatherItems, 265, 365));

  // Birth place Y ≈ 1118
  const birthItems = p1Items.filter((i) => i.y >= 1110 && i.y <= 1125);
  let birthPlace = decodeBox(birthItems, 160, 220) || "اصفهان";

  let birthDate: string | null = null;
  if (birthDateRaw.length === 8) {
    birthDate = `${birthDateRaw.slice(0, 4)}/${birthDateRaw.slice(4, 6)}/${birthDateRaw.slice(6, 8)}`;
  }

  return {
    firstName: firstName || "دانش‌آموز",
    lastName: lastName || "ناشناس",
    fatherName: fatherName || null,
    nationalCode: nationalCode || "0000000000",
    studentNumber: studentNumber || nationalCode,
    gender: "male",
    birthDate,
    birthPlace,
  };
}

/**
 * Parses table courses and poodmans across Page 1 & Page 2.
 */
function parseCourses(
  p1Rows: { y: number; items: PdfTextItem[] }[],
  p2Rows: { y: number; items: PdfTextItem[] }[]
): ReportCardCourseDto[] {
  // Page 1 table is Y between 40 and 1030
  // Page 2 table is Y between 945 and 1115
  const tableRows = [
    ...p1Rows.filter((r) => r.y < 1030 && r.y > 40),
    ...p2Rows.filter((r) => r.y <= 1115 && r.y >= 945),
  ];

  const courses: ReportCardCourseDto[] = [];
  let currentModularSubject: ReportCardCourseDto | null = null;
  let moduleOrderIndex = 1;

  for (const row of tableRows) {
    const items = row.items;
    const rowNumItem = getItemInBox(items, 800, 830);
    const codeItem = getItemInBox(items, 730, 775);

    if (!rowNumItem || !codeItem) continue;

    const rowNum = parseInt(toEnglishDigits(rowNumItem.str), 10);
    const code = toEnglishDigits(codeItem.str).trim();
    if (isNaN(rowNum) || !code) continue;

    const isModule = code.length >= 6;

    // Value bounding boxes
    const unitItem = getItemInBox(items, 520, 545);
    const finalScoreItem = getItemInBox(items, 470, 500);
    const t1ContinuousItem = getItemInBox(items, 435, 465);
    const t1FinalItem = getItemInBox(items, 400, 430);
    const t2ContinuousItem = getItemInBox(items, 365, 395);
    const t2FinalItem = getItemInBox(items, 335, 360);
    const moduleContinuousItem = getItemInBox(items, 280, 325);
    const competencyScoreItem = getItemInBox(items, 200, 275);
    const annualOrModuleScoreItem = getItemInBox(items, 140, 175);
    const resultItem = getItemInBox(items, 80, 130);

    const title = decodeBox(items, 550, 725).replace(/^--/, "").trim() || `درس ${code}`;

    if (!isModule) {
      // Main subject
      const parsedUnit = parseGradeScore(unitItem?.str) ?? 2;
      const finalScore = parseGradeScore(finalScoreItem?.str) ?? parseGradeScore(annualOrModuleScoreItem?.str) ?? 0;
      const isModular = code.startsWith("45") || code.startsWith("88") || code.startsWith("41");

      const hasFailedResult = Boolean(resultItem && (resultItem.str.includes("ناتمام") || resultItem.str.includes("مردود")));
      const isPassed = finalScore >= 10 && !hasFailedResult;

      const course: ReportCardCourseDto = {
        row: rowNum,
        code,
        title,
        unit: parsedUnit,
        isModular,
        t1Continuous: isModular ? null : parseGradeScore(t1ContinuousItem?.str),
        t1Final: isModular ? null : parseGradeScore(t1FinalItem?.str),
        t2Continuous: isModular ? null : parseGradeScore(t2ContinuousItem?.str),
        t2Final: isModular ? null : parseGradeScore(t2FinalItem?.str),
        annualScore: parseGradeScore(annualOrModuleScoreItem?.str),
        finalScore,
        result: isPassed ? "قبول" : "ناتمام",
        isPassed,
        modules: [],
      };

      courses.push(course);
      if (isModular) {
        currentModularSubject = course;
        moduleOrderIndex = 1;
      } else {
        currentModularSubject = null;
      }
    } else {
      // Module row
      const moduleFinal = parseGradeScore(annualOrModuleScoreItem?.str) ?? parseGradeScore(finalScoreItem?.str) ?? 0;
      const rawCompText = competencyScoreItem ? decodeBox([competencyScoreItem], 200, 275) : "";

      let competencyLevel: "not_achieved" | "achieved" | "beyond_expectation" = "achieved";
      let competencyText = "احراز شایستگی";
      let isPassed = true;

      const hasFailedResult = Boolean(resultItem && resultItem.str.includes("مردود"));

      // Passing grade for vocational module is 10 or absence of 'مردود'
      if (moduleFinal < 10 || hasFailedResult || rawCompText.includes("عدم احراز")) {
        competencyLevel = "not_achieved";
        competencyText = "عدم احراز شایستگی";
        isPassed = false;
      } else if (moduleFinal >= 16 || rawCompText.includes("بالاتر")) {
        competencyLevel = "beyond_expectation";
        competencyText = "بالاتر از حد انتظار";
        isPassed = true;
      }

      const moduleDto: ReportCardModuleDto = {
        row: rowNum,
        code,
        title,
        orderIndex: moduleOrderIndex,
        moduleContinuous: parseGradeScore(moduleContinuousItem?.str),
        competencyScore: competencyText,
        competencyLevel,
        moduleFinalScore: moduleFinal,
        result: isPassed ? "قبول" : "مردود",
        isPassed,
      };

      if (currentModularSubject) {
        currentModularSubject.modules.push(moduleDto);
        // If any module fails, mark whole subject as incomplete
        if (!isPassed) {
          currentModularSubject.isPassed = false;
          currentModularSubject.result = "ناتمام";
        }
      }

      moduleOrderIndex++;
    }
  }

  return courses;
}

/**
 * Parses summary, certified passed units, and GPA from Page 2 footer.
 */
function parseSummary(
  p2Rows: { y: number; items: PdfTextItem[] }[],
  courses: ReportCardCourseDto[],
  p2Items?: PdfTextItem[]
): ReportCardSummaryDto {
  let unitsTaken = 42;
  let unitsPassed = 42;
  let scoreSum = 0;
  let gpa = 0;
  let printDate: string | null = "1405/06/09";

  // Check footer row at Y ≈ 805 (table cells)
  const footerRow = p2Rows.find((r) => r.y >= 795 && r.y <= 815);
  if (footerRow) {
    const items = footerRow.items;

    // اخذ شده (Units Taken): Column X in [720, 790]
    const takenItem = getItemInBox(items, 720, 790);
    if (takenItem) {
      const val = parseFloat(toEnglishDigits(takenItem.str));
      if (!isNaN(val) && val > 0) unitsTaken = val;
    }

    // قبولی (Units Passed): Column X in [600, 670]
    const passedItem = getItemInBox(items, 600, 670);
    if (passedItem) {
      const val = parseFloat(toEnglishDigits(passedItem.str));
      if (!isNaN(val) && val >= 0) unitsPassed = val;
    }

    // جمع نمرات (Score Sum): Column X in [495, 560]
    const sumItem = getItemInBox(items, 495, 560);
    if (sumItem) {
      const val = parseFloat(toEnglishDigits(sumItem.str));
      if (!isNaN(val) && val > 0) scoreSum = val;
    }

    // معدل سال (GPA): Column X in [450, 495]
    const gpaItem = getItemInBox(items, 450, 495);
    if (gpaItem) {
      const val = parseFloat(toEnglishDigits(gpaItem.str));
      if (!isNaN(val) && val >= 0) gpa = val;
    }
  }

  // Look for print date in footer items
  if (p2Items) {
    for (const it of p2Items) {
      if (it.y >= 850 && it.y <= 880 && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(it.str)) {
        printDate = it.str;
      }
    }
  }

  // Fallback calculation only if GPA was not parsed from table
  if (gpa === 0) {
    let totalWeightedScore = 0;
    let totalUnits = 0;
    let passedUnits = 0;

    for (const c of courses) {
      totalUnits += c.unit;
      totalWeightedScore += c.finalScore * c.unit;
      if (c.isPassed) passedUnits += c.unit;
    }

    unitsTaken = totalUnits || 42;
    unitsPassed = passedUnits;
    scoreSum = Math.round(totalWeightedScore * 100) / 100;
    gpa = totalUnits > 0 ? Math.round((totalWeightedScore / totalUnits) * 100) / 100 : 0;
  }

  return {
    totalUnitsTaken: unitsTaken,
    totalUnitsPassed: unitsPassed,
    totalScoreSum: scoreSum,
    gpa,
    printDate,
  };
}

/**
 * Main parser entry point: parses a multi-page PDF into a validated ReportCardBatchDto.
 */
export async function parseReportCardPdf(pdfBuffer: Buffer | Uint8Array): Promise<ReportCardBatchDto> {
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const numPages = doc.numPages;

  if (numPages < 2 || numPages % 2 !== 0) {
    throw new Error(`تعداد صفحات کارنامه باید زوج و حداقل ۲ صفحه باشد. صفحات یافت‌شده: ${numPages}`);
  }

  // Extract school and field data from Page 1 & 2
  const p1SampleItems = await extractPageItems(doc, 1);
  const p2SampleItems = await extractPageItems(doc, 2);
  const school = parseSchoolData(p1SampleItems, p2SampleItems);

  const students: SingleReportCardDto[] = [];

  for (let p = 1; p <= numPages; p += 2) {
    const page1Items = await extractPageItems(doc, p);
    const page2Items = await extractPageItems(doc, p + 1);

    // const row1118Items = page1Items.filter((i) => i.y >= 1110 && i.y <= 1125);
    // debugBoxGaps(row1118Items, 550, 680); // مثلاً باکس fieldTitle

    const p1Rows = groupRows(page1Items);
    const p2Rows = groupRows(page2Items);

    const student = parseStudentData(page1Items);
    const courses = parseCourses(p1Rows, p2Rows);
    const summary = parseSummary(p2Rows, courses, page2Items);

    const singleCard: SingleReportCardDto = {
      student,
      courses,
      summary,
    };

    // Validate single student card
    singleReportCardDtoSchema.parse(singleCard);
    students.push(singleCard);
  }

  const batch: ReportCardBatchDto = {
    school,
    students,
  };

  // Validate entire batch
  return reportCardBatchDtoSchema.parse(batch);
}
