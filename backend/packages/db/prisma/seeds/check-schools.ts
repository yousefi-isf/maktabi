import { prisma } from "@maktabi/db";

const total = await prisma.school.count();
const test = await prisma.school.count({
	where: { name: { startsWith: "مدرسه آزمایشی" } },
});
console.log("total schools:", total, "| test schools:", test);
await prisma.$disconnect();
