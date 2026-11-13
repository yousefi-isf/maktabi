import { TRPCError } from "@trpc/server";
import { PERMISSIONS } from "../../config/permissions.js";

export interface AttendanceAccess {
	activeSchoolId: string;
	user: { id: string; isSuperAdmin?: boolean };
	permissions: readonly string[];
}

export function allows(access: AttendanceAccess, permission: string) {
	return Boolean(
		access.user.isSuperAdmin ||
			access.permissions.includes(PERMISSIONS.SYSTEM.FULL_ACCESS) ||
			access.permissions.includes(permission),
	);
}

export function requirePermission(
	access: AttendanceAccess,
	permission: string,
) {
	if (!allows(access, permission))
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "برای این عملیات دسترسی ندارید.",
		});
}

export function canManageAttendance(access: AttendanceAccess) {
	return allows(access, PERMISSIONS.ENROLLMENT.TEACHER_ASSIGN);
}

export function requireClassroomAccess(access: AttendanceAccess) {
	if (
		![
			PERMISSIONS.ATTENDANCE.RECORD_CREATE,
			PERMISSIONS.ATTENDANCE.RECORD_UPDATE,
			PERMISSIONS.ATTENDANCE.RECORD_READ,
		].some((permission) => allows(access, permission))
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "به حضور و غیاب کلاس دسترسی ندارید.",
		});
	}
}

export function classAccessWhere(access: AttendanceAccess) {
	return {
		schoolId: access.activeSchoolId,
		deletedAt: null,
		...(canManageAttendance(access)
			? {}
			: {
					OR: [
						{
							homeroomTeacher: {
								userId: access.user.id,
								schoolId: access.activeSchoolId,
								deletedAt: null,
							},
						},
						{
							teachingAssignments: {
								some: {
									deletedAt: null,
									teacher: {
										userId: access.user.id,
										schoolId: access.activeSchoolId,
										deletedAt: null,
									},
								},
							},
						},
					],
				}),
	};
}

export function tehranDay(date: string) {
	const start = new Date(`${date}T00:00:00+03:30`);
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
		!Number.isFinite(start.getTime()) ||
		new Date(start.getTime() + 12_600_000).toISOString().slice(0, 10) !== date
	) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "تاریخ معتبر نیست." });
	}
	return { start, end: new Date(start.getTime() + 86_400_000) };
}

export function validateManualConfirmation(
	status: string,
	hasPunch: boolean,
	note: string,
) {
	const manual = ["present", "late"].includes(status) && !hasPunch;
	if ((manual || status === "excused") && !note.trim())
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "برای حضور بدون ثبت دستگاه یا غیبت موجه، توضیح الزامی است.",
		});
	return manual;
}

export function tehranToday() {
	return new Date(Date.now() + 12_600_000).toISOString().slice(0, 10);
}
