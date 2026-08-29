import consola from "consola";
import { hash } from "@node-rs/argon2";
import { prisma } from "@maktabi/db";
import { ARGON } from "../../../../src/modules/auth/auth.js";
import { createId } from "@paralleldrive/cuid2";


export async function createSuperAdmin() {
	const passwordHash = await hash("yousefi@1234", ARGON);

	let user = await prisma.user.findUnique({
		where: { nationalCode: "1274219345" },
	});

	if (user) {
		user = await prisma.user.update({
			where: { id: user.id },
			data: {
				fullName: "مدیر پلتفرم",
				email: "m.yousefi.isf@gmail.com",
				emailVerified: true,
				isSuperAdmin: true,
			},
		});
	} else {
		user = await prisma.user.create({
			data: {
				fullName: "مدیر پلتفرم",
				email: "m.yousefi.isf@gmail.com",
				emailVerified: true,
				nationalCode: "1274219345",
				isSuperAdmin: true,
			},
		});
	}

	let authAccount = await prisma.authAccount.findUnique({
		where: {
			providerId_accountId: {
				accountId: user.id,
				providerId: "credential",
			},
		},
	});

	if (authAccount) {
		await prisma.authAccount.update({
			where: { id: authAccount.id },
			data: { password: passwordHash },
		});
	} else {
		await prisma.authAccount.create({
			data: {
				id: createId(),
				userId: user.id,
				accountId: user.id,
				providerId: "credential",
				password: passwordHash,
			},
		});
	}


	consola.info("Super admin user created succesfully", { email: user.email });
}
