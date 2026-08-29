import { prisma } from "@maktabi/db";
import { syncPermissions } from "./seeds/sync-permissions"
import { createSuperAdmin } from "./seeds/super-admin"
import { seedSchools } from "./seeds/schools"
async function seed() {
	// await syncPermissions()
	// await createSuperAdmin()
	await seedSchools(100)
}

seed().finally(() => prisma.$disconnect());
