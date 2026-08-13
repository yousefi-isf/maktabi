import consola from "consola";
import { hash } from "@node-rs/argon2";
import { prisma } from "@maktabi/db";
import { env } from "#env";
import { ARGON } from "./modules/auth/auth.js";
import { createId } from "@paralleldrive/cuid2";

async function createSuperAdmin() {
	const passwordHash = await hash(env.SUPER_ADMIN_PASSWORD, ARGON);

	const school = await prisma.school.create({
		data: {
			name: "حاج حسین صرامی",
			city: "اصفهان",
			district: "ناحیه 5",
			province: "",
			schoolType: "high_school",
		},
	});

	const user = await prisma.user.create({
		data: {
			fullName: "مدیریت حاج حسین صرامی",
			email: env.SUPER_ADMIN_USERNAME,
			emailVerified: true,
			nationalCode: "1274219345",
		},
	});

	await prisma.authAccount.create({
		data: {
			id: createId(),
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: passwordHash,
		},
	});

	const userSchool = await prisma.userSchool.create({
		data: {
			userId: user.id,
			schoolId: school.id,
			status: "active",
			isDefault: true,
			joinedAt: new Date(),
		},
	});

	const permission = await prisma.permission.create({
		data: { code: "system.full_access" },
	});

	const role = await prisma.role.create({
		data: { name: "مدیر", schoolId: null, description: "اختیارات مدیریت" },
	});

	await prisma.rolePermission.create({
		data: { roleId: role.id, permissionId: permission.id },
	});

	await prisma.userRole.create({
		data: {
			roleId: role.id,
			schoolId: userSchool.schoolId,
			userId: userSchool.userId,
		},
	});

	consola.log("Super admin user created succesfully", { email: user.email });
}

createSuperAdmin().finally(() => prisma.$disconnect());
