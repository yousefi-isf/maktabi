import fs from "fs";
import { getDocumentProxy } from "unpdf";

async function analyzeGlyphs() {
  const pdfPath = "C:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf";
  const pdfBuffer = fs.readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));

  console.log("Analyzing students across", doc.numPages, "pages...");

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

    // Name row Y around 1166
    const nameRow = items.filter(i => i.y >= 1160 && i.y <= 1172);
    nameRow.sort((a, b) => b.x - a.x);

    // First name is in x between 268 and 380
    const fnItems = nameRow.filter(i => i.x >= 268 && i.x <= 378);
    // Last name is in x between 80 and 218
    const lnItems = nameRow.filter(i => i.x >= 80 && i.x <= 218);

    const fnRaw = fnItems.map(i => i.str).join("");
    const lnRaw = lnItems.map(i => i.str).join("");

    const fnCodes = Array.from(fnRaw).map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} (${c})`).join(" ");
    const lnCodes = Array.from(lnRaw).map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} (${c})`).join(" ");

    console.log(`Student ${Math.ceil(p / 2)} (Page ${p}):`);
    console.log(`  First name items: ${fnItems.map(i => i.str).join(" | ")} [${fnCodes}]`);
    console.log(`  Last name items:  ${lnItems.map(i => i.str).join(" | ")} [${lnCodes}]`);
  }
}

analyzeGlyphs().catch(console.error);

