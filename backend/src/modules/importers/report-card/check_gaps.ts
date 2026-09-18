import fs from "fs";
import { getDocumentProxy } from "unpdf";

async function checkGaps() {
  const pdfPath = "C:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf";
  const pdfBuffer = fs.readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));

  // Page 3 is student 2: مانی توسلی نسب
  const page = await doc.getPage(3);
  const content = await page.getTextContent();
  const items = content.items
    .filter((it: any) => "str" in it && it.str.trim())
    .map((it: any) => ({
      str: it.str.trim(),
      x: Math.round(it.transform[4]),
      y: Math.round(it.transform[5]),
      w: Math.round(it.width),
    }))
    .filter((i: any) => i.y >= 1160 && i.y <= 1172 && i.x >= 80 && i.x <= 218)
    .sort((a: any, b: any) => b.x - a.x);

  console.log("LastName items for Student 2:");
  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    const prev = items[i - 1];
    const gap = prev ? (prev.x - (cur.x + cur.w)) : 0;
    console.log(`Item ${i}: x=${cur.x}, w=${cur.w}, str='${cur.str}' (gap from prev=${gap})`);
  }
}

checkGaps().catch(console.error);

