import type { PermissionRequirement } from "./permissions";

export const DASHBOARD_REQUIREMENT = {
	allOf: ["attendance.record.read", "assessment.score.read"],
} as const satisfies PermissionRequirement;
