import consola from "consola";
import { prisma } from "@maktabi/db";
import { createSuperAdmin } from "./seeds/create-super-admin"
import { syncPermissions } from "./seeds/sync-permissions"
async function seed() {
	await createSuperAdmin()
	await syncPermissions()
}

seed().finally(() => prisma.$disconnect());
