import { prisma } from "@maktabi/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PunchPayload {
  /** Shared secret sent by the attendance-gateway — validated before processing. */
  secret: string;
  /** School context: which school this device belongs to. */
  schoolId: string;
  /** Raw userId from the ZKTeco device (first 9 digits of nationalCode). */
  deviceUserId: string;
  /** Exact timestamp from the device hardware clock (ISO string). */
  recordTime: string;
  /** IP address of the physical ZKTeco device. */
  deviceIp: string;
  /** ZKTeco internal serial number for this punch record (userSn field). */
  deviceSn: number;
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Processes a raw punch event from the ZKTeco attendance device.
 *
 * Lookup strategy:
 *   deviceUserId (9 digits) → User.nationalCode startsWith deviceUserId
 *   → Student in the given school
 *
 * Iranian national codes are 10 digits where the 10th is a checksum derived
 * from the first 9. Therefore the first 9 digits uniquely identify a person —
 * no two valid national codes share the same 9-digit prefix.
 */
export async function processPunch(payload: PunchPayload): Promise<PunchResult> {
  const { schoolId, deviceUserId, recordTime, deviceIp, deviceSn } = payload;

  // ------------------------------------------------------------------
  // 1. Idempotency check — same device + same serial = same punch
  // ------------------------------------------------------------------
  const existing = await prisma.devicePunchLog.findUnique({
    where: { deviceIp_deviceSn: { deviceIp, deviceSn } },
    select: { id: true, studentId: true, recordTime: true },
  });

  if (existing) {
    // Already processed — return cached result without hitting DB again
    return {
      id: existing.id,
      schoolId,
      studentId: existing.studentId,
      studentName: null,
      nationalCode: null,
      recordTime: existing.recordTime,
      alreadyExists: true,
    };
  }

  // ------------------------------------------------------------------
  // 2. Resolve deviceUserId (9-digit prefix) → Student
  //    Query: User.nationalCode LIKE 'deviceUserId%' AND Student.schoolId
  //
  //    Fix: ZKTeco often trims leading zeros, and short IDs (like "4")
  //    should not broadly match any national code starting with "4".
  //    We pad it strictly to 9 digits (e.g. "4" -> "000000004") before matching.
  // ------------------------------------------------------------------
  const paddedDeviceUserId = deviceUserId.padStart(9, '0');

  let resolvedStudentId: string | null = null;
  let resolvedStudentName: string | null = null;
  let resolvedNationalCode: string | null = null;

  const student = await prisma.student.findFirst({
    where: {
      schoolId,
      deletedAt: null,
      userSchool: {
        user: {
          nationalCode: { startsWith: paddedDeviceUserId },
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      userSchool: {
        select: {
          user: {
            select: { fullName: true, nationalCode: true },
          },
        },
      },
    },
  });

  if (student) {
    resolvedStudentId = student.id;
    resolvedStudentName = student.userSchool.user.fullName;
    resolvedNationalCode = student.userSchool.user.nationalCode;
  }

  // ------------------------------------------------------------------
  // 3. Persist the raw punch log
  // ------------------------------------------------------------------
  const log = await prisma.devicePunchLog.create({
    data: {
      schoolId,
      studentId: resolvedStudentId,
      deviceUserId,
      recordTime: new Date(recordTime),
      deviceIp,
      deviceSn,
    },
    select: { id: true, recordTime: true },
  });

  return {
    id: log.id,
    schoolId,
    studentId: resolvedStudentId,
    studentName: resolvedStudentName,
    nationalCode: resolvedNationalCode,
    recordTime: log.recordTime,
    alreadyExists: false,
  };
}

