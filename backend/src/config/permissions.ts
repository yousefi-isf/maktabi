export const PERMISSIONS = {
	SYSTEM: {
		FULL_ACCESS: "system.full_access",
	},
	IDENTITY: {
		USER_LIST: "identity.user.list",
		USER_CREATE: "identity.user.create",
		USER_UPDATE: "identity.user.update",
		USER_DELETE: "identity.user.delete",
		USER_INVITE: "identity.user.invite",
		ROLE_CREATE: "identity.role.create",
		ROLE_ASSIGN: "identity.role.assign",
		ROLE_LIST: "identity.role.list",
	},
	ACADEMIC: {
		YEAR_CREATE: "academic.year.create",
		YEAR_DELETE: "academic.year.delete",
		EXAM_CREATE: "academic.exam.create",
		EXAM_READ: "academic.exam.read",
		EXAM_READ_OWN: "academic.exam.read.own",
		EXAM_PUBLISH: "academic.exam.publish",
	},
	ATTENDANCE: {
		RECORD_READ: "attendance.record.read",
		RECORD_READ_OWN: "attendance.record.read.own",
	},
} as const;

type FlattenValues<T> = T extends string
	? T
	: T extends object
	? FlattenValues<T[keyof T]>
	: never;
export type PermissionCode = FlattenValues<typeof PERMISSIONS>;

function flatten(obj: Record<string, unknown>): PermissionCode[] {
	const out: PermissionCode[] = [];
	for (const value of Object.values(obj)) {
		if (typeof value === "string") {
			out.push(value as PermissionCode);
		} else if (value && typeof value === "object") {
			out.push(...flatten(value as Record<string, unknown>));
		}
	}
	return out;
}

export const ALL_PERMISSIONS: PermissionCode[] = flatten(PERMISSIONS);
