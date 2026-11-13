import { parseReportCards } from "./src/modules/importers/report-card/text-report-parser.js";
export { parseReportCards } from "./src/modules/importers/report-card/text-report-parser.js";
export type { StudentReport } from "./src/modules/importers/report-card/text-report-parser.js";


import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";

const reports = parseReportCards(await readFile("karname-2.txt", "utf8"));

writeFileSync("output.txt", JSON.stringify(reports, null, 2), "utf8");