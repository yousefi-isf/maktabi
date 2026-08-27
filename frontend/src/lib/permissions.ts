import type { inferRouterOutputs } from "@trpc/server";
import type { ReactNode } from "react";
import type { FileRouteTypes } from "@/routeTree.gen.js";
import type { PermissionCode as PermissionC } from "../../../backend/src/config/permissions.js";
import type { AppRouter } from "../../../backend/src/trpc/router.js";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type AuthMe = RouterOutputs["auth"]["me"];
export type PermissionCode = PermissionC | (string & {});

export type PermissionRequirement =
	| PermissionCode
	| { anyOf: readonly PermissionCode[] }
	| { allOf: readonly PermissionCode[] };

type AppPath = FileRouteTypes["fullPaths"];
export type PermissionNavItem = {
	title: string;
	// url: string;
	url: AppPath;
	icon?: ReactNode;
	isActive?: boolean;
	required?: PermissionRequirement;
	items?: readonly PermissionNavItem[];
};

function allows(
	granted: ReadonlySet<PermissionCode>,
	requirement?: PermissionRequirement,
) {
	if (!requirement || granted.has("system.full_access")) return true;

	if (typeof requirement === "string") {
		return granted.has(requirement);
	}

	if ("anyOf" in requirement) {
		return requirement.anyOf.some((permission) => granted.has(permission));
	}

	return requirement.allOf.every((permission) => granted.has(permission));
}

export function hasPermission(
	permissions: readonly PermissionCode[],
	requirement?: PermissionRequirement,
) {
	return allows(new Set(permissions), requirement);
}

export function filterNavigation(
	items: readonly PermissionNavItem[],
	permissions: readonly PermissionCode[],
): PermissionNavItem[] {
	const granted = new Set(permissions);

	const visit = (entries: readonly PermissionNavItem[]): PermissionNavItem[] =>
		entries.flatMap((item) => {
			if (!allows(granted, item.required)) return [];

			const children = item.items ? visit(item.items) : undefined;
			if (item.items && children?.length === 0) return [];

			return [{ ...item, items: children }];
		});

	return visit(items);
}
