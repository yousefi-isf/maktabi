import { prisma } from "@maktabi/db";
import { createSaramiPrincipal } from "./seeds/sarami-principal.js";
import { syncPermissions } from "./seeds/sync-permissions.js";

async function seedSaramiPrincipal() {
  await syncPermissions();

  const school = await prisma.school.findFirst({
    where: { name: "حاج حسین صرامی", deletedAt: null },
  });

  if (!school) {
    await prisma.school.create({
      data: {
        name: "حاج حسین صرامی",
        district: "ناحیه ۳",
        city: "اصفهان",
        province: "اصفهان",
        schoolType: "technical",
        address: "خیابان فرضی، کوچه نمونه، پلاک ۱",
        phone: "03131234567",
      },
    });
  }

  await createSaramiPrincipal();
}

seedSaramiPrincipal()
  .then(() => {
    console.log("Sarami principal seeded successfully!");
  })
  .catch((err) => {
    console.error("Error seeding Sarami principal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

