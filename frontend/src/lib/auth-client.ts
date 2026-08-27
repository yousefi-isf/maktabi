import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../backend/src/modules/auth/auth.js";

const apiBaseUrl = (import.meta.env.VITE_API_URL ??
	"http://localhost:4000") as string;

export const authClient = createAuthClient({
	baseURL: `${apiBaseUrl}/api/auth`,
	fetchOptions: {
		credentials: "include",
	},
	plugins: [
		inferAdditionalFields<typeof auth>({
			user: {
				nationalCode: true,
				phone: true,
			},
			session: {
				activeSchoolId: true,
			},
		}),
	],
});
