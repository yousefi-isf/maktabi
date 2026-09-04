import { prisma } from "@maktabi/db";
import { syncPermissions } from "./seeds/sync-permissions"
import { createSuperAdmin } from "./seeds/super-admin"
import { seedAcademicYears } from "./seeds/academic-year"
import { seedSaramiPrincipalPermissions, seedSaramiSchool, seedSaramiPrincipal, seedSaramiTerms, seedSaramiGradeLevels, seedSaramiFieldsOfStudy, seedSaramiRoles } from "./seeds/sarami-school"
import { createSaramiPrincipal } from "./seeds/sarami-principal"

async function seed() {
	// await syncPermissions()
	// await createSuperAdmin()
	// await seedSchools(100)
	// await seedAcademicYears(3)
	// await seedSaramiSchool()
	// await seedSaramiPrincipal()
	// await seedSaramiTerms()
	// await seedSaramiGradeLevels()
	// await seedSaramiFieldsOfStudy()
	// await seedSaramiRoles()
	// await seedSaramiPrincipalPermissions()
}

seed().finally(() => prisma.$disconnect());
