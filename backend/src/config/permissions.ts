export const PERMISSIONS = {
	SYSTEM: {
		FULL_ACCESS: "system.full_access",
	},
	IDENTITY: {
		// schools
		SCHOOL_LIST: "identity.school.list",
		SCHOOL_CREATE: "identity.school.create",
		SCHOOL_UPDATE: "identity.school.update",

		// users & members
		USER_LIST: "identity.user.list",
		USER_CREATE: "identity.user.create",
		USER_UPDATE: "identity.user.update",
		USER_DELETE: "identity.user.delete",
		USER_INVITE: "identity.user.invite",

		// students
		STUDENT_LIST: "identity.student.list",
		STUDENT_CREATE: "identity.student.create",
		STUDENT_UPDATE: "identity.student.update",
		STUDENT_DELETE: "identity.student.delete",

		// roles & permissions
		ROLE_CREATE: "identity.role.create",
		ROLE_UPDATE: "identity.role.update",
		ROLE_DELETE: "identity.role.delete",
		ROLE_ASSIGN: "identity.role.assign",
		ROLE_LIST: "identity.role.list",
		PERMISSION_LIST: "identity.permission.list",
	},
	ACADEMIC: {
		// basic settings
		YEAR_CREATE: "academic.year.create",
		YEAR_UPDATE: "academic.year.update",
		YEAR_DELETE: "academic.year.delete",
		YEAR_LIST: "academic.year.list",

		TERM_CREATE: "academic.term.create",
		TERM_UPDATE: "academic.term.update",
		TERM_LIST: "academic.term.list",

		GRADE_CREATE: "academic.grade.create",
		GRADE_UPDATE: "academic.grade.update",
		GRADE_LIST: "academic.grade.list",

		FIELD_CREATE: "academic.field.create",
		FIELD_UPDATE: "academic.field.update",
		FIELD_DELETE: "academic.field.delete",
		FIELD_LIST: "academic.field.list",

		// subjects & curriculum
		SUBJECT_CREATE: "academic.subject.create",
		SUBJECT_UPDATE: "academic.subject.update",
		SUBJECT_LIST: "academic.subject.list",

		CURRICULUM_CREATE: "academic.curriculum.create",
		CURRICULUM_LIST: "academic.curriculum.list",

		// classes
		CLASS_CREATE: "academic.class.create",
		CLASS_UPDATE: "academic.class.update",
		CLASS_LIST: "academic.class.list",
	},
	ENROLLMENT: {
		STUDENT_ENROLL: "enrollment.student.enroll",
		STUDENT_UNENROLL: "enrollment.student.unenroll",
		STUDENT_LIST: "enrollment.student.list",

		TEACHER_ASSIGN: "enrollment.teacher.assign",
		TEACHER_LIST: "enrollment.teacher.list",
	},
	ASSESSMENT: {
		EXAM_CREATE: "assessment.exam.create",
		EXAM_UPDATE: "assessment.exam.update",
		EXAM_DELETE: "assessment.exam.delete",
		EXAM_READ: "assessment.exam.read",
		EXAM_READ_OWN: "assessment.exam.read.own", // for student/parent

		SCORE_CREATE: "assessment.score.create", // teacher grading
		SCORE_UPDATE: "assessment.score.update",
		SCORE_READ: "assessment.score.read",
		SCORE_READ_OWN: "assessment.score.read.own", // for student/parent
	},
	ATTENDANCE: {
		RECORD_CREATE: "attendance.record.create", // teacher taking attendance
		RECORD_UPDATE: "attendance.record.update",
		RECORD_READ: "attendance.record.read",
		RECORD_READ_OWN: "attendance.record.read.own",
	},
	COMMUNICATION: {
		ANNOUNCEMENT_CREATE: "communication.announcement.create",
		ANNOUNCEMENT_DELETE: "communication.announcement.delete",
		ANNOUNCEMENT_READ: "communication.announcement.read",
	},
	IMPORTER: {
		REPORT_CARD_PREVIEW: "importer.report_card.preview",
		REPORT_CARD_EXECUTE: "importer.report_card.execute",
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
	"identity.school.update": "Update school details",
	"identity.user.list": "View users and their school memberships",
	"identity.user.create": "Create users and add them to the active school",
	"identity.user.update": "Update user information and school memberships",
	"identity.user.delete": "Delete users from the system",
	"identity.user.invite": "Invite users to join the active school",
	"identity.student.list": "View students in the active school",
	"identity.student.create": "Create and register students in the active school",
	"identity.student.update": "Update student profiles",
	"identity.student.delete": "Delete students from the active school",
	"identity.role.create": "Create roles for the active school",
	"identity.role.update": "Update roles",
	"identity.role.delete": "Delete roles",
	"identity.role.assign": "Assign roles to users in the active school",
	"identity.role.list": "View roles and their assigned permissions",
	"identity.permission.list": "View available system permissions",

	"academic.year.create": "Create academic years",
	"academic.year.update": "Update academic years",
	"academic.year.delete": "Delete academic years",
	"academic.year.list": "View academic years",
	"academic.term.create": "Create terms",
	"academic.term.update": "Update terms",
	"academic.term.list": "View terms",
	"academic.grade.create": "Create grade levels",
	"academic.grade.update": "Update grade levels",
	"academic.grade.list": "View grade levels",
	"academic.field.create": "Create fields of study",
	"academic.field.update": "Update fields of study",
	"academic.field.delete": "Delete fields of study",
	"academic.field.list": "View fields of study",
	"academic.subject.create": "Create subjects and modules",
	"academic.subject.update": "Update subjects",
	"academic.subject.list": "View subjects",
	"academic.curriculum.create": "Define curriculums (units, weights)",
	"academic.curriculum.list": "View curriculums",
	"academic.class.create": "Create classes",
	"academic.class.update": "Update classes",
	"academic.class.list": "View classes",

	"enrollment.student.enroll": "Enroll students into classes",
	"enrollment.student.unenroll": "Remove students from classes",
	"enrollment.student.list": "View class enrollments",
	"enrollment.teacher.assign": "Assign teachers to class subjects",
	"enrollment.teacher.list": "View teaching assignments",

	"assessment.exam.create": "Create exams",
	"assessment.exam.update": "Update exams",
	"assessment.exam.delete": "Delete exams",
	"assessment.exam.read": "View all exams",
	"assessment.exam.read.own": "View exams assigned to the current user",
	"assessment.score.create": "Enter student scores",
	"assessment.score.update": "Update student scores",
	"assessment.score.read": "View all student scores",
	"assessment.score.read.own": "View own scores",

	"attendance.record.create": "Record student attendance",
	"attendance.record.update": "Update student attendance",
	"attendance.record.read": "View all attendance records",
	"attendance.record.read.own": "View own attendance records",

	"communication.announcement.create": "Create announcements",
	"communication.announcement.delete": "Delete announcements",
	"communication.announcement.read": "View announcements",

	"importer.report_card.preview": "Preview and parse report card PDF files",
	"importer.report_card.execute": "Import report cards and batch create school data",
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
