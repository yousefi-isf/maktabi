import fs from "fs";
import { getDocumentProxy } from "unpdf";

async function inspect() {
  const pdfPath = "C:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf";
  const pdfBuffer = fs.readFileSync(pdfPath);
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer));

  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  const items = textContent.items
    .filter((it: any) => "str" in it && it.str.trim())
    .map((it: any) => ({
      str: it.str.trim(),
      x: Math.round(it.transform[4]),
      y: Math.round(it.transform[5]),
      w: Math.round(it.width),
    }))
    .sort((a: any, b: any) => b.y - a.y || b.x - a.x);

  // Group into rows
  const rows: { y: number; items: typeof items }[] = [];
  for (const item of items) {
    const existing = rows.find((r) => Math.abs(r.y - item.y) <= 4);
    if (existing) existing.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  console.log("=== Page 1 Header (y > 1130) ===");
  for (const r of rows.filter(r => r.y > 1130)) {
    r.items.sort((a, b) => b.x - a.x);
    console.log(`Y=${r.y}: ${r.items.map(i => `[x=${i.x},w=${i.w}: "${i.str}"]`).join(" ")}`);
  }

  console.log("\n=== Page 1 Courses (First 6 course rows, y between 900 and 1030) ===");
  for (const r of rows.filter(r => r.y >= 900 && r.y <= 1030)) {
    r.items.sort((a, b) => b.x - a.x);
    console.log(`Y=${r.y}: ${r.items.map(i => `[x=${i.x},w=${i.w}: "${i.str}"]`).join(" ")}`);
  }
}

inspect().catch(console.error);

