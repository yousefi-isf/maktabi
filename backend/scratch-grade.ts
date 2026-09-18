import { getDocumentProxy } from "unpdf";
import fs from "fs";

async function run() {
  const buf = fs.readFileSync("c:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf");
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const items = content.items
    .filter(i => i.str.trim())
    .map(i => ({ str: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }));

  // Find items in Y≈1150 row and X 480-540
  const row = items.filter(i => i.y >= 1144 && i.y <= 1157).sort((a, b) => b.x - a.x);
  console.log("=== Y≈1150 full row ===");
  for (const it of row) {
    const cps = Array.from(it.str).map(c => `${c}(U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(" ");
    console.log(`  X=${it.x} | "${it.str}" | ${cps}`);
  }
}
run();

