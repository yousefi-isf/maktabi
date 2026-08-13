import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@maktabi/db";
import { hash, verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { env } from "#env";

export const ARGON = {
	memoryCost: 19_456,
	timeCost: 2,
	parallelism: 1,
	secret: Buffer.from(env.PASSWORD_PEPPER),
};

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: [env.CLIENT_ORIGIN],
	advanced: {
		useSecureCookies: env.NODE_ENV === "production",
	},

	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		password: {
			hash: (password) => hash(password, ARGON),
			verify: ({ hash: passwordHash, password }) =>
				verify(passwordHash, password, ARGON),
		},
	},

	user: {
		modelName: "User",
		fields: { name: "fullName" },
		additionalFields: {
			nationalCode: { type: "string", required: true, input: true },
			phone: { type: "string", required: false, input: true },
		},
	},
	session: {
		modelName: "AuthSession",
		expiresIn: 60 * 60 * 8, // 8 hours
		updateAge: 60 * 60, // 1 hour
		additionalFields: {
			activeSchoolId: { type: "string", required: false, input: false },
		},
	},
	account: { modelName: "AuthAccount" },
	verification: { modelName: "AuthVerification" },

	databaseHooks: {
		session: {
			create: {
				before: async (session) => {
					const user = await prisma.user.findFirst({
						where: { id: session.userId, deletedAt: null },
						select: {
							userSchools: {
								where: {
									status: "active",
									deletedAt: null,
									school: { deletedAt: null },
								},
								orderBy: [{ isDefault: "desc" }, { joinedAt: "asc" }],
								take: 1,
								select: { schoolId: true },
							},
						},
					});

					const membership = user?.userSchools[0];
					if (!membership) return false;

					return {
						data: {
							...session,
							activeSchoolId: membership.schoolId,
						},
					};
				},
			},
		},
	},
});

export type AuthSessionResult = NonNullable<
	Awaited<ReturnType<typeof auth.api.getSession>>
>;
