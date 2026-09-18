import { parseReportCardPdf } from "./src/modules/importers/report-card/parser.js";
import fs from "fs";

async function test() {
  const buf = fs.readFileSync("c:/Users/myou/.gemini/antigravity/brain/12bc1f3d-a651-4340-9676-ffb00f3b503c/.user_uploaded/media_1789042898524.pdf");
  const data = await parseReportCardPdf(buf);
  console.log("School:", data.school.name);
  console.log("Province:", data.school.province);
  console.log("District:", data.school.district);
  console.log("Field:", data.school.fieldTitle);
  console.log("Field Code:", data.school.fieldCode);
  console.log("Grade Title:", data.school.gradeTitle);
  console.log("Students Count:", data.students.length);
}
test();
