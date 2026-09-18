import fs from "fs";
import { getDocumentProxy } from "unpdf";

const SIDA_GLYPH_MAP: Record<string, string> = {
  "︀": "ا", "ا": "ا", "آ": "آ",
  "︋": "ب", "︊": "ب", "︉": "ب", "ب": "ب",
  "︎": "پ", "پ": "پ",
  "︑": "ت", "︐": "ت", "ت": "ت", "️": "ت", // Note: U+FE0F in text positions is te
  "︒": "ث", "︔": "ث", "︓": "ث", "ث": "ث",
  "︗": "ج", "︖": "ج", "ج": "ج",
  "︚": "چ", "︘": "چ", "چ": "چ",
  "︝": "ح", "︜": "ح", "︛": "ح", "ح": "ح",
  "︠": "خ", "︟": "خ", "خ": "خ",
  "︡": "د", "د": "د",
  "︤": "ذ", "︢": "ذ", "ذ": "ذ",
  "︣": "ر", "ر": "ر",
  "︥": "ز", "ز": "ز",
  "︦": "ژ", "ژ": "ژ",
  "︧": "س", "︨": "س", "︩": "س", "س": "س",
  "︪": "ش", "︫": "ش", "ش": "ش",
  "︮": "ص", "︭": "ص", "ص": "ص",
  "︯": "ض", "︲": "ض", "︱": "ض", "ض": "ض",
  "︵": "ط", "︳": "ط", "ط": "ط",
  "ظ": "ظ",
  "︺": "ع", "︻": "ع", "ع": "ع",
  "︽": "غ", "︾": "غ", "غ": "غ",
  "﹀": "ف", "﹁": "ف", "︿": "ف", "ف": "ف",
  "﹇": "ق", "﹆": "ق", "ق": "ق",
  "﹋": "ک", "﹊": "ک", "﹈": "ک", "﹉": "ک", "ك": "ک", "ک": "ک",
  "﹎": "گ", "گ": "گ",
  "﹚": "ل", "﹏": "ل", "﹛": "ل", "﹑": "ل", "ل": "ل",
  "﹝": "م", "﹞": "م", "م": "م",
  "﹡": "ن", "﹟": "ن", "﹠": "ن", "ن": "ن",
  "﹢": "و", "و": "و", "﹣": "ؤ",
  "﹨": "ه", "﹧": "ه", "﹤": "ه", "ه": "ه",
  "﹩": "ی", "﹫": "ی", "﹬": "ی", "﹪": "ی", "ي": "ی", "ی": "ی",
  "﹯": "ئ", "ئ": "ئ", "ء": "ء",
  "(": ")", ")": "(", ":": ":", "-": "-", "،": "،", "؛": "؛",
};

function decodeBox(items: { str: string; x: number }[], minX: number, maxX: number): string {
  const inBox = items.filter((i) => i.x >= minX && i.x <= maxX);
  inBox.sort((a, b) => b.x - a.x);
  const mapped = inBox.map((it) => {
    const chars = Array.from(it.str);
    return chars.map((ch) => SIDA_GLYPH_MAP[ch] || ch).join("");
  });
  return mapped.join("").replace(/\s+/g, " ").trim();
}

async function runTest() {
  const pdfPath = "C:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf";
  const pdfBuffer = fs.readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));

  console.log(`Checking all ${doc.numPages / 2} students...`);
  for (let p = 1; p <= doc.numPages; p += 2) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((it: any) => "str" in it && it.str.trim())
      .map((it: any) => ({
        str: it.str.trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
      }));

    const nameRow = items.filter(i => i.y >= 1160 && i.y <= 1172);
    const firstName = decodeBox(nameRow, 268, 378);
    const lastName = decodeBox(nameRow, 80, 218);

    const fatherRow = items.filter(i => i.y >= 1145 && i.y <= 1155);
    const fatherName = decodeBox(fatherRow, 265, 365);

    console.log(`${Math.ceil(p / 2)}. ${firstName} ${lastName} (پدر: ${fatherName})`);
  }
}

runTest().catch(console.error);

