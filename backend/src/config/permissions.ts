export const PERMISSIONS = {
	SYSTEM: {
		FULL_ACCESS: "system.full_access",
	},
	IDENTITY: {
		// schools
		SCHOOL_LIST: "identity.school.list",
		SCHOOL_CREATE: "identity.school.create",

		// users
		USER_LIST: "identity.user.list",
		USER_CREATE: "identity.user.create",
		USER_UPDATE: "identity.user.update",
		USER_DELETE: "identity.user.delete",
		USER_INVITE: "identity.user.invite",

		// roles
		ROLE_CREATE: "identity.role.create",
		ROLE_ASSIGN: "identity.role.assign",
		ROLE_LIST: "identity.role.list",

		// permissions
		PERMISSION_LIST: "identity.permission.list",
	},
	ACADEMIC: {

		// academic year
		YEAR_CREATE: "academic.year.create",
		YEAR_DELETE: "academic.year.delete",

		// exam
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

export const PERMISSION_DESCRIPTIONS = {
	"system.full_access": "Full access to all system capabilities",
	"identity.school.list": "View schools available to the current user",
	"identity.school.create": "Create schools",
	"identity.user.list": "View users and their school memberships",
	"identity.user.create": "Create users and add them to the active school",
	"identity.user.update": "Update user information and school memberships",
	"identity.user.delete": "Delete users from the system",
	"identity.user.invite": "Invite users to join the active school",
	"identity.role.create": "Create roles for the active school",
	"identity.role.assign": "Assign roles to users in the active school",
	"identity.role.list": "View roles and their assigned permissions",
	"identity.permission.list": "View available system permissions",
	"academic.year.create": "Create academic years",
	"academic.year.delete": "Delete academic years",
	"academic.exam.create": "Create academic exams",
	"academic.exam.read": "View all academic exams",
	"academic.exam.read.own": "View academic exams assigned to the current user",
	"academic.exam.publish": "Publish academic exams and make them available",
	"attendance.record.read": "View attendance records",
	"attendance.record.read.own": "View the current user's attendance records",
} satisfies Record<PermissionCode, string>;

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
