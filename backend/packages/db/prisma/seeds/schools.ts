import consola from "consola";
import type { SchoolType } from "@maktabi/db/client";
import { prisma } from "@maktabi/db";

const SCHOOL_TYPES: SchoolType[] = ["middle_school", "high_school", "technical"];

const DISTRICTS = [
	{ district: "منطقه ۱", city: "اصفهان", province: "اصفهان" },
	{ district: "منطقه ۲", city: "اصفهان", province: "اصفهان" },
	{ district: "منطقه ۳", city: "اصفهان", province: "اصفهان" },
	{ district: "منطقه ۴", city: "اصفهان", province: "اصفهان" },
	{ district: "منطقه ۵", city: "تهران", province: "تهران" },
	{ district: "منطقه ۶", city: "تهران", province: "تهران" },
	{ district: "منطقه ۷", city: "شیراز", province: "فارس" },
	{ district: "منطقه ۸", city: "مشهد", province: "خراسان رضوی" },
	{ district: "منطقه ۹", city: "تبریز", province: "آذربایجان شرقی" },
	{ district: "منطقه ۱۰", city: "رشت", province: "گیلان" },
];

export async function seedSchools(count = 100) {
	const existing = await prisma.school.count({
		where: { name: { startsWith: "مدرسه آزمایشی" } },
	});
	if (existing >= count) {
		consola.info(`Skipping school seed, ${existing} test schools already exist`);
		return;
	}

	const data = Array.from({ length: count }, (_, i) => {
		const loc = DISTRICTS[i % DISTRICTS.length];
		return {
			name: `مدرسه آزمایشی ${String(i + 1).padStart(3, "0")}`,
			district: loc.district,
			city: loc.city,
			province: loc.province,
			schoolType: SCHOOL_TYPES[i % SCHOOL_TYPES.length],
			address: `آدرس آزمایشی ${i + 1}`,
			phone: `031${String(30000000 + i).slice(0, 8)}`,
		};
	});

	await prisma.school.createMany({ data });
	consola.info(`Created ${count} test schools`);
}
