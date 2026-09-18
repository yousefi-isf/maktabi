import { getDocumentProxy } from "unpdf";
import fs from "fs";

async function run() {
  const buf = fs.readFileSync("c:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf");
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const items = content.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));

  // Dump top headers
  console.log("=== Y > 1110 ===");
  items.filter(i => i.y > 1110).sort((a, b) => b.y - a.y || b.x - a.x).forEach(i => console.log(Math.round(i.y), Math.round(i.x), i.str));
}
run();

