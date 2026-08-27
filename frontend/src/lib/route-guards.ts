import { redirect } from "@tanstack/react-router";
import { hasPermission, type PermissionRequirement } from "./permissions";

interface GuardContext {
	context: {
		me: {
			permissions: readonly string[];
		};
	};
}

export function guardPermission(requirement: PermissionRequirement) {
	return ({ context }: GuardContext) => {
		if (!hasPermission(context.me.permissions, requirement)) {
			throw redirect({ to: "/" });
		}
	};
}
