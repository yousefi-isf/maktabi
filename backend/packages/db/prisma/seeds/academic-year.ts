import consola from "consola";
import { prisma } from "@maktabi/db";

export async function seedAcademicYears(yearsToCreate = 3) {
    // Find all schools (limit to 50 for performance during seed if many exist)
    const schools = await prisma.school.findMany({
        take: 50,
    });

    if (schools.length === 0) {
        consola.warn("هیچ مدرسه‌ای برای ایجاد سال تحصیلی یافت نشد.");
        return;
    }

    let createdCount = 0;

    for (const school of schools) {
        const existingYears = await prisma.academicYear.count({
            where: { schoolId: school.id },
        });

        if (existingYears >= yearsToCreate) {
            consola.info(`مدرسه ${school.name} در حال حاضر ${existingYears} سال تحصیلی دارد.`);
            continue;
        }

        // Create academic years like 1401-1402, 1402-1403, 1403-1404
        const baseYear = 1401; // Starting from 1401-1402 (approx 2022-2023)
        const startBaseDate = new Date("2022-09-23T00:00:00.000Z"); // 1 Mehr
        const endBaseDate = new Date("2023-06-21T00:00:00.000Z"); // 31 Khordad

        const data = Array.from({ length: yearsToCreate }, (_, i) => {
            const startYear = baseYear + i;
            const endYear = startYear + 1;

            const startDate = new Date(startBaseDate);
            startDate.setFullYear(startDate.getFullYear() + i);

            const endDate = new Date(endBaseDate);
            endDate.setFullYear(endDate.getFullYear() + i);

            return {
                schoolId: school.id,
                title: `${startYear}-${endYear}`,
                startDate,
                endDate,
                isActive: i === yearsToCreate - 1, // Make the last created year the active one
            };
        });

        await prisma.academicYear.createMany({ data });
        createdCount += data.length;
    }

    if (createdCount > 0) {
        consola.success(`${createdCount} سال تحصیلی با موفقیت ایجاد شد.`);
    }
}

