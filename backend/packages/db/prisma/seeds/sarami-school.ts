import consola from "consola";
import { prisma } from "@maktabi/db";

export async function seedSaramiSchool() {
    // 1. Create the school
    const school = await prisma.school.create({
        data: {
            name: "Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ",
            district: "Ù†Ø§Ø­ÛŒÙ‡ Û³", // random district
            city: "Ø§ØµÙÙ‡Ø§Ù†", // random city
            province: "Ø§ØµÙÙ‡Ø§Ù†", // random province
            schoolType: "technical", // random type
            address: "Ø®ÛŒØ§Ø¨Ø§Ù† ÙØ±Ø¶ÛŒØŒ Ú©ÙˆÚ†Ù‡ Ù†Ù…ÙˆÙ†Ù‡ØŒ Ù¾Ù„Ø§Ú© Û±",
            phone: "03131234567",
        },
    });

    consola.success(`Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯.`);

    // 2. Create the academic year 1405-1406
    // Approximate dates: 1 Mehr 1405 ~ 23 Sep 2026, 31 Khordad 1406 ~ 21 Jun 2027
    const startDate = new Date("2026-09-23T00:00:00.000Z");
    const endDate = new Date("2027-06-21T00:00:00.000Z");

    const academicYear = await prisma.academicYear.create({
        data: {
            schoolId: school.id,
            title: "1405-1406",
            startDate: startDate,
            endDate: endDate,
            isActive: true,
        },
    });

    consola.success(`Ø³Ø§Ù„ ØªØ­ØµÛŒÙ„ÛŒ '${academicYear.title}' Ø¨Ø±Ø§ÛŒ Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯.`);
}

export async function seedSaramiPrincipal() {
    // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ù…Ø¯Ø±Ø³Ù‡ ØµØ±Ø§Ù…ÛŒ
    const school = await prisma.school.findFirst({
        where: { name: "Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ" }
    });

    if (!school) {
        throw new Error("Ù…Ø¯Ø±Ø³Ù‡ Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯! Ø§Ø¨ØªØ¯Ø§ Ø¨Ø§ÛŒØ¯ Ù…Ø¯Ø±Ø³Ù‡ Ø³Ø§Ø®ØªÙ‡ Ø´ÙˆØ¯.");
    }

    // Ø¨Ø±Ø±Ø³ÛŒ Ùˆ Ø§ÛŒØ¬Ø§Ø¯ Ù†Ù‚Ø´ Ù…Ø¯ÛŒØ±
    let principalRole = await prisma.role.findFirst({
        where: { schoolId: school.id, name: "Ù…Ø¯ÛŒØ±" }
    });

    if (!principalRole) {
        principalRole = await prisma.role.create({
            data: {
                schoolId: school.id,
                name: "Ù…Ø¯ÛŒØ±",
                description: "Ù…Ø¯ÛŒØ± Ù…Ø¯Ø±Ø³Ù‡",
                isSystem: false,
            }
        });
    }

    // ØªÙˆÙ„ÛŒØ¯ Ú©Ø¯ Ù…Ù„ÛŒ Ùˆ Ù…ÙˆØ¨Ø§ÛŒÙ„ ØªØµØ§Ø¯ÙÛŒ
    const randomNationalCode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const randomPhone = "09" + Math.floor(100000000 + Math.random() * 900000000).toString();

    // Ø§ÛŒØ¬Ø§Ø¯ Ú©Ø§Ø±Ø¨Ø±
    const user = await prisma.user.create({
        data: {
            fullName: "Ù…Ø­Ù…Ø¯ ÛŒÙˆØ³ÙÛŒ",
            nationalCode: randomNationalCode,
            email: `yousefi_${Date.now()}@example.com`,
            phone: randomPhone,
            isSuperAdmin: false,
        },
    });

    consola.success(`Ú©Ø§Ø±Ø¨Ø± '${user.fullName}' Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯.`);

    // Ø§Ù†ØªØ³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø± Ø¨Ù‡ Ù…Ø¯Ø±Ø³Ù‡
    await prisma.userSchool.create({
        data: {
            userId: user.id,
            schoolId: school.id,
            isDefault: true,
            joinedAt: new Date(),
        },
    });

    // Ø§Ù†ØªØ³Ø§Ø¨ Ù†Ù‚Ø´ Ù…Ø¯ÛŒØ± Ø¨Ù‡ Ú©Ø§Ø±Ø¨Ø± Ø¯Ø± Ø§ÛŒÙ† Ù…Ø¯Ø±Ø³Ù‡
    await prisma.userRole.create({
        data: {
            userId: user.id,
            schoolId: school.id,
            roleId: principalRole.id,
        },
    });

    consola.success(`Ú©Ø§Ø±Ø¨Ø± '${user.fullName}' Ø¨Ù‡ Ø¹Ù†ÙˆØ§Ù† Ù…Ø¯ÛŒØ± Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' ØªØ®ØµÛŒØµ ÛŒØ§ÙØª.`);
}
export async function seedSaramiTerms() {
    // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ù…Ø¯Ø±Ø³Ù‡ ØµØ±Ø§Ù…ÛŒ
    const school = await prisma.school.findFirst({
        where: { name: "Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ" }
    });

    if (!school) {
        throw new Error("Ù…Ø¯Ø±Ø³Ù‡ Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯!");
    }

    // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ø³Ø§Ù„ ØªØ­ØµÛŒÙ„ÛŒ Û±Û´Û°Ûµ-Û±Û´Û°Û¶ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù…Ø¯Ø±Ø³Ù‡
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId: school.id, title: "1405-1406" }
    });

    if (!academicYear) {
        throw new Error("Ø³Ø§Ù„ ØªØ­ØµÛŒÙ„ÛŒ Û±Û´Û°Ûµ-Û±Û´Û°Û¶ ÛŒØ§ÙØª Ù†Ø´Ø¯!");
    }

    // Ù†ÙˆØ¨Øª Ø§ÙˆÙ„ (Ù…Ù‡Ø± ØªØ§ Ø¯ÛŒ)
    const term1StartDate = new Date("2026-09-23T00:00:00.000Z");
    const term1EndDate = new Date("2027-01-20T00:00:00.000Z");

    const term1 = await prisma.term.upsert({
        where: {
            academicYearId_termNumber: {
                academicYearId: academicYear.id,
                termNumber: 1
            }
        },
        update: {},
        create: {
            schoolId: school.id,
            academicYearId: academicYear.id,
            termNumber: 1,
            title: "Ù†ÙˆØ¨Øª Ø§ÙˆÙ„",
            startDate: term1StartDate,
            endDate: term1EndDate
        }
    });

    consola.success(`ØªØ±Ù… '${term1.title}' Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯.`);

    // Ù†ÙˆØ¨Øª Ø¯ÙˆÙ… (Ø¨Ù‡Ù…Ù† ØªØ§ Ø®Ø±Ø¯Ø§Ø¯)
    const term2StartDate = new Date("2027-01-21T00:00:00.000Z");
    const term2EndDate = new Date("2027-06-21T00:00:00.000Z");

    const term2 = await prisma.term.upsert({
        where: {
            academicYearId_termNumber: {
                academicYearId: academicYear.id,
                termNumber: 2
            }
        },
        update: {},
        create: {
            schoolId: school.id,
            academicYearId: academicYear.id,
            termNumber: 2,
            title: "Ù†ÙˆØ¨Øª Ø¯ÙˆÙ…",
            startDate: term2StartDate,
            endDate: term2EndDate
        }
    });

    consola.success(`ØªØ±Ù… '${term2.title}' Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯.`);
}

export async function seedSaramiGradeLevels() {
    // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ù…Ø¯Ø±Ø³Ù‡ ØµØ±Ø§Ù…ÛŒ
    const school = await prisma.school.findFirst({
        where: { name: "Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ" }
    });

    if (!school) {
        throw new Error("Ù…Ø¯Ø±Ø³Ù‡ Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯!");
    }

    const grades = [
        { title: "Ø¯Ù‡Ù…", orderIndex: 10, stage: "high_school" },
        { title: "ÛŒØ§Ø²Ø¯Ù‡Ù…", orderIndex: 11, stage: "high_school" },
        { title: "Ø¯ÙˆØ§Ø²Ø¯Ù‡Ù…", orderIndex: 12, stage: "high_school" }
    ] as const;

    for (const grade of grades) {
        const createdGrade = await prisma.gradeLevel.upsert({
            where: {
                schoolId_orderIndex: {
                    schoolId: school.id,
                    orderIndex: grade.orderIndex
                }
            },
            update: {},
            create: {
                schoolId: school.id,
                title: grade.title,
                orderIndex: grade.orderIndex,
                stage: grade.stage
            }
        });

        consola.success(`Ù¾Ø§ÛŒÙ‡ '${createdGrade.title}' Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø¨Ø±Ø§ÛŒ Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' Ø§ÛŒØ¬Ø§Ø¯/Ø¨Ø±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø´Ø¯.`);
    }
}

export async function seedSaramiFieldsOfStudy() {
    // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ù…Ø¯Ø±Ø³Ù‡ ØµØ±Ø§Ù…ÛŒ
    const school = await prisma.school.findFirst({
        where: { name: "Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ" }
    });

    if (!school) {
        throw new Error("Ù…Ø¯Ø±Ø³Ù‡ Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯!");
    }

    const fieldsOfStudy = [
        // Ø±Ø´ØªÙ‡â€ŒÙ‡Ø§ÛŒ Ù†Ø¸Ø±ÛŒ (Theoretical)
        { title: "Ø±ÛŒØ§Ø¶ÛŒ-ÙÛŒØ²ÛŒÚ©", branch: "theoretical" },
        { title: "Ø¹Ù„ÙˆÙ… ØªØ¬Ø±Ø¨ÛŒ", branch: "theoretical" },
        { title: "Ø§Ø¯Ø¨ÛŒØ§Øª Ùˆ Ø¹Ù„ÙˆÙ… Ø§Ù†Ø³Ø§Ù†ÛŒ", branch: "theoretical" },
        { title: "Ø¹Ù„ÙˆÙ… Ùˆ Ù…Ø¹Ø§Ø±Ù Ø§Ø³Ù„Ø§Ù…ÛŒ", branch: "theoretical" },

        // Ø±Ø´ØªÙ‡â€ŒÙ‡Ø§ÛŒ ÙÙ†ÛŒâ€ŒÙˆØ­Ø±ÙÙ‡â€ŒØ§ÛŒ (Technical) - Ø¯Ø§Ø±Ø§ÛŒ Ø¯Ø±ÙˆØ³ Ù¾ÙˆØ¯Ù…Ø§Ù†ÛŒ
        { title: "Ø´Ø¨Ú©Ù‡ Ùˆ Ù†Ø±Ù…â€ŒØ§ÙØ²Ø§Ø± Ø±Ø§ÛŒØ§Ù†Ù‡", branch: "technical" },
        { title: "Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±ÛŒ", branch: "technical" },
        { title: "Ø§Ù„Ú©ØªØ±ÙˆÙ†ÛŒÚ©", branch: "technical" },
        { title: "Ù…Ú©Ø§Ù†ÛŒÚ© Ø®ÙˆØ¯Ø±Ùˆ", branch: "technical" },
        { title: "Ù…Ø¹Ù…Ø§Ø±ÛŒ Ø¯Ø§Ø®Ù„ÛŒ", branch: "technical" },
        { title: "ØªØ±Ø¨ÛŒØª Ø¨Ø¯Ù†ÛŒ", branch: "technical" },
        { title: "Ú¯Ø±Ø§ÙÛŒÚ©", branch: "technical" },

        // Ø±Ø´ØªÙ‡â€ŒÙ‡Ø§ÛŒ Ú©Ø§Ø±Ø¯Ø§Ù†Ø´ (Vocational) - Ø¯Ø§Ø±Ø§ÛŒ Ø¯Ø±ÙˆØ³ Ù¾ÙˆØ¯Ù…Ø§Ù†ÛŒ
        { title: "ØªØ¹Ù…ÛŒØ± Ù…ÙˆØªÙˆØ±Ù‡Ø§ÛŒ Ø¯ÛŒØ²Ù„", branch: "vocational" },
        { title: "ØªØµÙˆÛŒØ±Ø³Ø§Ø²ÛŒ Ø¯ÛŒØ¬ÛŒØªØ§Ù„ÛŒ", branch: "vocational" }
    ] as const;

    for (const field of fieldsOfStudy) {
        // Ú†ÙˆÙ† Ù‚ÛŒØ¯ ÛŒÙˆÙ†ÛŒÚ© Ø±ÙˆÛŒ Ø¹Ù†ÙˆØ§Ù† Ø±Ø´ØªÙ‡ Ù†Ø¯Ø§Ø±ÛŒÙ…ØŒ Ø§ÙˆÙ„ Ø¬Ø³ØªØ¬Ùˆ Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ…
        let existingField = await prisma.fieldOfStudy.findFirst({
            where: {
                schoolId: school.id,
                title: field.title
            }
        });

        if (!existingField) {
            existingField = await prisma.fieldOfStudy.create({
                data: {
                    schoolId: school.id,
                    title: field.title,
                    branch: field.branch
                }
            });
            consola.success(`Ø±Ø´ØªÙ‡ '${existingField.title}' Ø¨Ø±Ø§ÛŒ Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯.`);
        } else {
            consola.info(`Ø±Ø´ØªÙ‡ '${existingField.title}' Ø§Ø² Ù‚Ø¨Ù„ Ø¯Ø± Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø´Øª.`);
        }
    }
}

export async function seedSaramiRoles() {
    // Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ù…Ø¯Ø±Ø³Ù‡ ØµØ±Ø§Ù…ÛŒ
    const school = await prisma.school.findFirst({
        where: { name: "Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ" }
    });

    if (!school) {
        throw new Error("Ù…Ø¯Ø±Ø³Ù‡ Ø­Ø§Ø¬ Ø­Ø³ÛŒÙ† ØµØ±Ø§Ù…ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯!");
    }

    const roles = [
        { name: "Ø¯Ø§Ù†Ø´ Ø¢Ù…ÙˆØ²", description: "Ø¯Ø§Ù†Ø´ Ø¢Ù…ÙˆØ²Ø§Ù† Ù…Ø¯Ø±Ø³Ù‡" },
        { name: "Ù…Ø¹Ù„Ù…", description: "Ø¯Ø¨ÛŒØ±Ø§Ù† Ùˆ Ù‡Ù†Ø±Ø¢Ù…ÙˆØ²Ø§Ù†" },
        { name: "Ù…Ø¯ÛŒØ±", description: "Ù…Ø¯ÛŒØ± Ù…Ø¯Ø±Ø³Ù‡" },
        { name: "Ù…Ø¹Ø§ÙˆÙ† Ø¢Ù…ÙˆØ²Ø´ÛŒ", description: "Ù…Ø³Ø¦ÙˆÙ„ Ø§Ù…ÙˆØ± Ø¢Ù…ÙˆØ²Ø´ÛŒ Ùˆ Ú©Ù„Ø§Ø³â€ŒÙ‡Ø§" },
        { name: "Ù…Ø¹Ø§ÙˆÙ† Ù¾Ø±ÙˆØ±Ø´ÛŒ", description: "Ù…Ø³Ø¦ÙˆÙ„ Ø§Ù…ÙˆØ± ÙØ±Ù‡Ù†Ú¯ÛŒ Ùˆ Ø§Ù†Ø¶Ø¨Ø§Ø·ÛŒ" }
    ];

    for (const role of roles) {
        let existingRole = await prisma.role.findFirst({
            where: { schoolId: school.id, name: role.name }
        });

        if (!existingRole) {
            existingRole = await prisma.role.create({
                data: {
                    schoolId: school.id,
                    name: role.name,
                    description: role.description,
                    isSystem: false
                }
            });
        } else {
            existingRole = await prisma.role.update({
                where: { id: existingRole.id },
                data: { description: role.description }
            });
        }

        consola.success(`Ù†Ù‚Ø´ '${existingRole.name}' Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø¯Ø± Ù…Ø¯Ø±Ø³Ù‡ '${school.name}' Ø§ÛŒØ¬Ø§Ø¯/Ø¨Ø±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø´Ø¯.`);
    }
}

export async function seedSaramiPrincipalPermissions() {
    const school = await prisma.school.findFirst({
        where: { name: "حاج حسین صرامی" }
    });

    if (!school) {
        throw new Error("مدرسه حاج حسین صرامی یافت نشد!");
    }

    const principalRole = await prisma.role.findFirst({
        where: { schoolId: school.id, name: "مدیر" }
    });

    if (!principalRole) {
        throw new Error("نقش مدیر یافت نشد!");
    }

    // گرفتن تمام پرمیشن‌ها از دیتابیس به جز system.full_access
    const permissions = await prisma.permission.findMany({
        where: {
            code: { not: "system.full_access" }
        }
    });

    if (permissions.length === 0) {
        consola.warn("پرمیشنی در دیتابیس یافت نشد! لطفاً ابتدا تابع syncPermissions را اجرا کنید.");
        return;
    }

    let addedCount = 0;
    for (const perm of permissions) {
        const existing = await prisma.rolePermission.findFirst({
            where: {
                roleId: principalRole.id,
                permissionId: perm.id
            }
        });

        if (!existing) {
            await prisma.rolePermission.create({
                data: {
                    roleId: principalRole.id,
                    permissionId: perm.id
                }
            });
            addedCount++;
        }
    }

    consola.success(`${addedCount} پرمیشن با موفقیت به نقش مدیر مدرسه اختصاص یافت.`);
}

