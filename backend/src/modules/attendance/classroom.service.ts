import type { PrismaClient, Prisma } from "@maktabi/db";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS } from "../../config/permissions.js";
import {
	allows,
	classAccessWhere,
	requireClassroomAccess,
	requirePermission,
	tehranDay,
	validateManualConfirmation,
	type AttendanceAccess,
} from "./policy.js";

type Db = PrismaClient | Prisma.TransactionClient;
export interface DailyRecordInput {
	studentId: string;
	status: "present" | "absent" | "late" | "excused";
	note: string;
}

async function getClass(db: Db, access: AttendanceAccess, classId: string) {
	requireClassroomAccess(access);
	const schoolClass = await db.schoolClass.findFirst({
		where: { ...classAccessWhere(access), id: classId },
	});
	if (!schoolClass)
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "کلاس یافت نشد یا به این کلاس دسترسی ندارید.",
		});
	return schoolClass;
}

export async function getClassroomRoster(
	db: Db,
	access: AttendanceAccess,
	input: { classId: string; date: string },
) {
	const { start, end } = tehranDay(input.date);
	await getClass(db, access, input.classId);
	const enrollments = await db.enrollment.findMany({
		where: {
			schoolId: access.activeSchoolId,
			classId: input.classId,
			status: "active",
			deletedAt: null,
			student: {
				deletedAt: null,
				userSchool: {
					status: "active",
					deletedAt: null,
					user: { deletedAt: null },
				},
			},
		},
		include: {
			student: {
				include: {
					userSchool: { include: { user: { select: { fullName: true } } } },
				},
			},
		},
		orderBy: { student: { userSchool: { user: { fullName: "asc" } } } },
	});
	const studentIds = enrollments.map((enrollment) => enrollment.studentId);
	const [punches, confirmations] = await Promise.all([
		db.devicePunchLog.findMany({
			where: {
				schoolId: access.activeSchoolId,
				studentId: { in: studentIds },
				recordTime: { gte: start, lt: end },
			},
			orderBy: { recordTime: "asc" },
			select: { id: true, studentId: true, recordTime: true },
		}),
		db.attendance.findMany({
			where: {
				schoolId: access.activeSchoolId,
				classId: input.classId,
				studentId: { in: studentIds },
				attDate: { gte: start, lt: end },
				periodNo: null,
				deletedAt: null,
			},
			include: { confirmedBy: { select: { fullName: true } } },
			orderBy: { updatedAt: "desc" },
		}),
	]);
	return enrollments.map((enrollment) => ({
		studentId: enrollment.studentId,
		fullName: enrollment.student.userSchool.user.fullName,
		firstPunch:
			punches.find((punch) => punch.studentId === enrollment.studentId) ?? null,
		confirmation:
			confirmations.find(
				(record) => record.studentId === enrollment.studentId,
			) ?? null,
	}));
}

export async function confirmClassroom(
	db: PrismaClient,
	access: AttendanceAccess,
	input: {
		classId: string;
		date: string;
		termId: string;
		records: DailyRecordInput[];
	},
) {
	requirePermission(access, PERMISSIONS.ATTENDANCE.RECORD_CREATE);
	const { start } = tehranDay(input.date);
	if (start.getTime() > Date.now())
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "حضور و غیاب روز آینده قابل ثبت نیست.",
		});
	if (
		!input.records.length ||
		new Set(input.records.map((record) => record.studentId)).size !==
			input.records.length
	)
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "فهرست دانش‌آموزان خالی یا تکراری است.",
		});
	return db.$transaction(
		async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${access.activeSchoolId}:${input.classId}:${input.date}`}))`;
			const schoolClass = await getClass(tx, access, input.classId);
			const term = await tx.term.findFirst({
				where: {
					id: input.termId,
					schoolId: access.activeSchoolId,
					academicYearId: schoolClass.academicYearId,
					deletedAt: null,
				},
			});
			if (!term)
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "نوبت تحصیلی انتخاب‌شده متعلق به این کلاس نیست.",
				});
			const roster = await getClassroomRoster(tx, access, input);
			const students = new Map(
				roster.map((student) => [student.studentId, student]),
			);
			for (const record of input.records) {
				const student = students.get(record.studentId);
				if (!student)
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "دانش‌آموز عضو فعال این کلاس نیست.",
					});
				if (
					student.confirmation &&
					!allows(access, PERMISSIONS.ATTENDANCE.RECORD_UPDATE)
				)
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "اجازهٔ ویرایش حضور و غیاب ثبت‌شده را ندارید.",
					});
				const manualOverride = validateManualConfirmation(
					record.status,
					Boolean(student.firstPunch),
					record.note,
				);
				const data = {
					status: record.status,
					note: record.note.trim() || null,
					manualOverride,
					termId: term.id,
					classId: schoolClass.id,
					confirmedById: access.user.id,
					confirmedAt: new Date(),
					deletedAt: null,
					devicePunchLogId: student.firstPunch?.id ?? null,
				};
				const dailyKey = `${access.activeSchoolId}:${input.classId}:${record.studentId}:${input.date}`;
				// Reuse legacy daily records too; new records have a unique key to prevent duplicate confirmations.
				const saved = student.confirmation
					? await tx.attendance.update({
							where: { id: student.confirmation.id },
							data: { ...data, dailyKey },
						})
					: await tx.attendance.upsert({
							where: { dailyKey },
							create: {
								...data,
								dailyKey,
								schoolId: access.activeSchoolId,
								studentId: record.studentId,
								attDate: start,
							},
							update: data,
						});
				await tx.auditLog.create({
					data: {
						schoolId: access.activeSchoolId,
						userId: access.user.id,
						entityName: "Attendance",
						entityId: saved.id,
						action: student.confirmation
							? "attendance.update"
							: "attendance.confirm",
						...(student.confirmation
							? {
									oldValue: {
										status: student.confirmation.status,
										note: student.confirmation.note,
										manualOverride: student.confirmation.manualOverride,
									},
								}
							: {}),
						newValue: {
							status: data.status,
							note: data.note,
							manualOverride,
							date: input.date,
							devicePunchLogId: data.devicePunchLogId,
						},
					},
				});
			}
			return { confirmed: input.records.length };
		},
		{ timeout: 30_000 },
	);
}
