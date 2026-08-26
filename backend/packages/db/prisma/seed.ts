import { prisma } from "@maktabi/db";
import { syncPermissions } from "./seeds/sync-permissions"
import { createSuperAdmin } from "./seeds/super-admin"
async function seed() {
	await syncPermissions()
	await createSuperAdmin()
}

seed().finally(() => prisma.$disconnect());
