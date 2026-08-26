import consola from "consola";
import { hash } from "@node-rs/argon2";
import { prisma } from "@maktabi/db";
import { ARGON } from "../../../../src/modules/auth/auth.js";
import { createId } from "@paralleldrive/cuid2";


export async function createSuperAdmin() {
	const passwordHash = await hash("yousefi@1234", ARGON);

	const user = await prisma.user.create({
		data: {
			fullName: "مدیریت حاج حسین صرامی",
			email: "m.yousefi.isf@gmail.com",
			emailVerified: true,
			nationalCode: "1274219345",
			isSuperAdmin: true,
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


	consola.info("Super admin user created succesfully", { email: user.email });
}
