import { prisma, type PrismaClient } from "@maktabi/db";

export interface PunchPayload {
	secret: string;
	schoolId: string;
	deviceUserId: string;
	recordTime: string;
	deviceIp: string;
	/** Device user UID, never an event sequence; unavailable on some transports. */
	deviceSn?: number | null;
}

export interface PunchResult {
	id: string;
	schoolId: string;
	studentId: string | null;
	studentName: string | null;
	nationalCode: string | null;
	recordTime: Date;
	alreadyExists: boolean;
}

export class InvalidPunch extends Error {}

export function normalizePunchUserId(value: string) {
	const id = value
		.trim()
		.replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
		.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660));
	if (!/^\d{1,10}$/.test(id)) throw new InvalidPunch("Invalid device user ID.");
	return id.length <= 9 ? id.padStart(9, "0") : id;
}

const identityInclude = {
	student: {
		select: {
			userSchool: {
				select: { user: { select: { fullName: true, nationalCode: true } } },
			},
		},
	},
} as const;

export async function processDevicePunch(
	db: PrismaClient,
	payload: PunchPayload,
): Promise<PunchResult> {
	const deviceUserId = normalizePunchUserId(payload.deviceUserId);
	const recordTime = new Date(payload.recordTime);
	if (
		!Number.isFinite(recordTime.getTime()) ||
		(payload.deviceSn != null &&
			(!Number.isInteger(payload.deviceSn) || payload.deviceSn < 0))
	)
		throw new InvalidPunch("Invalid device attendance data.");
	const school = await db.school.findFirst({
		where: { id: payload.schoolId, deletedAt: null },
		select: { id: true },
	});
	if (!school)
		throw new InvalidPunch(
			"The configured SCHOOL_ID does not identify an active school.",
		);
	const event = {
		schoolId: school.id,
		deviceIp: payload.deviceIp,
		deviceUserId,
		recordTime,
	};
	// Earlier gateway versions stored IDs without leading zero normalization.
	const legacyIds = [
		...new Set([
			deviceUserId,
			payload.deviceUserId.trim(),
			deviceUserId.replace(/^0+(?=\d)/, ""),
		]),
	];
	let existing = await db.devicePunchLog.findFirst({
		where: { ...event, deviceUserId: { in: legacyIds } },
		include: identityInclude,
		orderBy: { createdAt: "asc" },
	});
	const candidates = await db.student.findMany({
		where: {
			schoolId: school.id,
			deletedAt: null,
			userSchool: {
				status: "active",
				deletedAt: null,
				user: {
					deletedAt: null,
					nationalCode:
						deviceUserId.length === 10
							? deviceUserId
							: { startsWith: deviceUserId },
				},
			},
		},
		select: {
			id: true,
			userSchool: {
				select: { user: { select: { fullName: true, nationalCode: true } } },
			},
		},
		take: 2,
	});
	// Ambiguous or unknown IDs remain unlinked instead of selecting an arbitrary pupil.
	const student = candidates.length === 1 ? candidates[0] : null;
	if (existing && !existing.studentId && student) {
		existing = await db.devicePunchLog.update({
			where: { id: existing.id },
			data: { studentId: student.id },
			include: identityInclude,
		});
	}
	let alreadyExists = Boolean(existing);
	let saved = existing;
	if (!saved) {
		try {
			saved = await db.devicePunchLog.create({
				data: {
					...event,
					studentId: student?.id ?? null,
					deviceSn: payload.deviceSn ?? null,
				},
				include: identityInclude,
			});
		} catch (error) {
			if ((error as { code?: string }).code !== "P2002") throw error;
			saved = await db.devicePunchLog.findUnique({
				where: { event },
				include: identityInclude,
			});
			if (!saved) throw error;
			alreadyExists = true;
		}
	}
	return {
		id: saved.id,
		schoolId: saved.schoolId,
		studentId: saved.studentId,
		studentName: saved.student?.userSchool.user.fullName ?? null,
		nationalCode: saved.student?.userSchool.user.nationalCode ?? null,
		recordTime: saved.recordTime,
		alreadyExists,
	};
}

export const processPunch = (payload: PunchPayload) =>
	processDevicePunch(prisma, payload);
