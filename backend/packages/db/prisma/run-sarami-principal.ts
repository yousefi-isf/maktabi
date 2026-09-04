import { prisma } from "@maktabi/db";
import { createSaramiPrincipal } from "./seeds/sarami-principal.js";

createSaramiPrincipal()
  .then(() => {
    console.log("Sarami principal seeded successfully!");
  })
  .catch((err) => {
    console.error("Error seeding Sarami principal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

