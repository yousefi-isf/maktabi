import fs from "fs";
import { getDocumentProxy } from "unpdf";

// Correct 1-to-1 character map for FastReport / Sida custom glyph encoding
const PURE_GLYPH_MAP: Record<string, string> = {
  "︀": "ا",
  "ا": "ا",
  "آ": "آ",
  "︋": "ب",
  "︊": "ب",
  "︉": "ب",
  "ب": "ب",
  "︎": "پ",
  "پ": "پ",
  "︑": "ت",
  "︐": "ت",
  "ت": "ت",
  "︒": "ث",
  "︔": "ث",
  "ث": "ث",
  "︗": "ج",
  "︖": "ج",
  "ج": "ج",
  "︚": "چ",
  "︘": "چ",
  "چ": "چ",
  "︝": "ح",
  "︜": "ح",
  "︛": "ح",
  "ح": "ح",
  "︠": "خ",
  "خ": "خ",
  "︡": "د",
  "د": "د",
  "︤": "ذ",
  "ذ": "ذ",
  "︣": "ر",
  "ر": "ر",
  "︥": "ز",
  "ز": "ز",
  "︦": "ژ",
  "ژ": "ژ",
  "︧": "س",
  "︨": "س",
  "︩": "س",
  "س": "س",
  "︪": "ش",
  "︫": "ش",
  "ش": "ش",
  "︮": "ص",
  "︭": "ص",
  "ص": "ص",
  "︯": "ض",
  "︲": "ض",
  "︱": "ض",
  "ض": "ض",
  "︵": "ط",
  "ط": "ط",
  "ظ": "ظ",
  "︺": "ع",
  "︻": "ع",
  "ع": "ع",
  "︽": "غ",
  "︾": "غ",
  "غ": "غ",
  "﹀": "ف",
  "﹁": "ف",
  "︿": "ف",
  "ف": "ف",
  "﹇": "ق",
  "﹆": "ق",
  "ق": "ق",
  "﹋": "ک",
  "﹊": "ک",
  "ك": "ک",
  "ک": "ک",
  "﹎": "گ",
  "گ": "گ",
  "﹚": "ل",
  "﹏": "ل",
  "﹛": "ل",
  "﹑": "ل",
  "ل": "ل",
  "﹝": "م",
  "﹞": "م",
  "م": "م",
  "﹡": "ن",
  "﹟": "ن",
  "﹠": "ن",
  "ن": "ن",
  "﹢": "و",
  "و": "و",
  "﹨": "ه",
  "﹧": "ه",
  "﹤": "ه",
  "ه": "ه",
  "﹩": "ی",
  "﹫": "ی",
  "﹬": "ی",
  "﹪": "ی",
  "ي": "ی",
  "ی": "ی",
  "﹯": "ئ",
  "ئ": "ئ",
  "ء": "ء",
  "(": ")",
  ")": "(",
  ":": ":",
  "-": "-",
  "،": "،",
  "؛": "؛",
};

function decodeBox(items: { str: string; x: number }[], minX: number, maxX: number): string {
  const inBox = items.filter((i) => i.x >= minX && i.x <= maxX);
  inBox.sort((a, b) => b.x - a.x);
  const mapped = inBox.map((it) => {
    const chars = Array.from(it.str);
    return chars.map((ch) => PURE_GLYPH_MAP[ch] || ch).join("");
  });
  return mapped.join("").replace(/\s+/g, " ").trim();
}

async function testDecodeCourses() {
  const pdfPath = "C:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf";
  const pdfBuffer = fs.readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));

  for (let p = 1; p <= 2; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((it: any) => "str" in it && it.str.trim())
      .map((it: any) => ({
        str: it.str.trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
      }));

    const rows: { y: number; items: typeof items }[] = [];
    for (const item of items) {
      const existing = rows.find((r) => Math.abs(r.y - item.y) <= 4);
      if (existing) existing.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    }

    const tableRows = rows.filter(r => (p === 1 && r.y < 1030 && r.y > 40) || (p === 2 && r.y <= 1115 && r.y >= 945));
    tableRows.sort((a, b) => b.y - a.y);

    console.log(`\n=== Decoded Courses on Page ${p} ===`);
    for (const r of tableRows) {
      const rowNumItem = r.items.find(i => i.x >= 800 && i.x <= 830);
      const codeItem = r.items.find(i => i.x >= 730 && i.x <= 775);
      if (!rowNumItem || !codeItem) continue;

      const code = codeItem.str;
      const rowNum = rowNumItem.str;
      const decodedTitle = decodeBox(r.items, 550, 725);
      console.log(`Row ${rowNum}: Code=${code} -> Title="${decodedTitle}"`);
    }
  }
}

testDecodeCourses().catch(console.error);

