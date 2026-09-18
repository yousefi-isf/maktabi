import { getDocumentProxy } from "unpdf";
import fs from "fs";

async function run() {
  const buf = fs.readFileSync("c:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf");
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const items = content.items.map(i => ({ str: i.str, x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }));

  // Print all header rows Y > 1100 with their X coords
  const headerItems = items.filter(i => i.y > 1100).sort((a, b) => b.y - a.y || b.x - a.x);

  // Print raw chars for each item to help find "دهم" / "پایه"
  const out: string[] = [];
  for (const it of headerItems) {
    const cps = Array.from(it.str).map(c => `${c}(U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(" ");
    out.push(`Y=${it.y} X=${it.x} | "${it.str}" | ${cps}`);
  }
  fs.writeFileSync("header-chars.txt", out.join("\n"), "utf8");
  console.log("Written to header-chars.txt");
}
run();

