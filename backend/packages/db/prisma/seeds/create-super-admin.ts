import consola from "consola";
import { hash } from "@node-rs/argon2";
import { prisma } from "@maktabi/db";
import { ARGON } from "../../../../src/modules/auth/auth.js";
import { createId } from "@paralleldrive/cuid2";

export async function createSuperAdmin() {
	const passwordHash = await hash("yousefi@1234", ARGON);

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
			email: "m.yousefi.isf@gmail.com",
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