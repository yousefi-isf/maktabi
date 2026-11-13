import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@maktabi/db";
import { confirmClassroom, getClassroomRoster } from "./classroom.service.js";
import {
	classAccessWhere,
	requireClassroomAccess,
	requirePermission,
	tehranDay,
	validateManualConfirmation,
	type AttendanceAccess,
} from "./policy.js";

const teacher: AttendanceAccess = {
	activeSchoolId: "school",
	user: { id: "teacher" },
	permissions: ["attendance.record.create", "attendance.record.update"],
};
const student: AttendanceAccess = {
	...teacher,
	user: { id: "student" },
	permissions: ["attendance.record.read.own"],
};
const manager: AttendanceAccess = {
	...teacher,
	permissions: ["system.full_access"],
};

function fakeDatabase() {
	const records = new Map<string, any>();
	const audit: any[] = [];
	const punches = [
		{
			id: "punch-1",
			schoolId: "school",
			studentId: "one",
			recordTime: new Date("2020-01-02T04:00:00Z"),
		},
	];
	const enrollments = ["one", "two"].map((id) => ({
		studentId: id,
		student: { userSchool: { user: { fullName: id } } },
	}));
	let rosterQueries = 0;
	const db = {
		$executeRaw: async () => 1,
		schoolClass: {
			findFirst: async ({ where }: any) =>
				where.schoolId === "school" && where.id === "class"
					? { id: "class", academicYearId: "year" }
					: null,
		},
		term: {
			findFirst: async ({ where }: any) =>
				where.id === "term" &&
				where.academicYearId === "year" &&
				where.schoolId === "school"
					? { id: "term" }
					: null,
		},
		enrollment: {
			findMany: async () => {
				rosterQueries++;
				return enrollments;
			},
		},
		devicePunchLog: { findMany: async () => punches },
		attendance: {
			findMany: async () =>
				[...records.values()].map((record) => ({
					...record,
					confirmedBy: { fullName: record.confirmedById },
				})),
			upsert: async ({ where, create, update }: any) => {
				const existing = records.get(where.dailyKey);
				const record = existing
					? { ...existing, ...update }
					: { id: `record-${records.size}`, ...create };
				records.set(where.dailyKey, record);
				return record;
			},
			update: async ({ where, data }: any) => {
				const entry = [...records.entries()].find(
					([, record]) => record.id === where.id,
				)!;
				const record = { ...entry[1], ...data };
				records.set(entry[0], record);
				return record;
			},
		},
		auditLog: {
			create: async ({ data }: any) => {
				audit.push(data);
				return data;
			},
		},
		$transaction: async (operation: (transaction: any) => unknown) =>
			operation(db),
	};
	return {
		db: db as unknown as PrismaClient,
		records,
		audit,
		punches,
		get rosterQueries() {
			return rosterQueries;
		},
	};
}
const scope = { classId: "class", date: "2020-01-02", termId: "term" };

test("a device punch stays pending until a teacher confirms the class", async () => {
	const { db, records } = fakeDatabase();
	const roster = await getClassroomRoster(db, teacher, scope);
	assert.ok(roster[0].firstPunch);
	assert.equal(roster[0].confirmation, null);
	assert.equal(records.size, 0);
});

test("confirmations preserve device evidence, manual explanation and actor; repeated saves update daily records", async () => {
	const { db, records, audit } = fakeDatabase();
	const input = {
		...scope,
		records: [
			{ studentId: "one", status: "present" as const, note: "" },
			{
				studentId: "two",
				status: "present" as const,
				note: "دستگاه اثر انگشت را نخواند",
			},
		],
	};
	assert.deepEqual(await confirmClassroom(db, teacher, input), {
		confirmed: 2,
	});
	const saved = [...records.values()];
	assert.equal(saved[0].devicePunchLogId, "punch-1");
	assert.equal(saved[0].manualOverride, false);
	assert.equal(saved[1].devicePunchLogId, null);
	assert.equal(saved[1].manualOverride, true);
	assert.equal(saved[1].note, input.records[1].note);
	assert.equal(saved[1].confirmedById, teacher.user.id);
	assert.ok(saved[1].confirmedAt instanceof Date);
	await confirmClassroom(db, teacher, {
		...scope,
		records: [
			{ studentId: "one", status: "absent", note: "در کلاس حاضر نبود" },
		],
	});
	assert.equal(records.size, 2);
	assert.equal([...records.values()][0].status, "absent");
	assert.equal(audit.length, 3);
	assert.equal(audit[2].oldValue.status, "present");
});

test("students, foreign classes, unrelated terms and unenrolled pupils cannot be confirmed", async () => {
	const fake = fakeDatabase();
	await assert.rejects(getClassroomRoster(fake.db, student, scope), {
		code: "FORBIDDEN",
	});
	assert.equal(fake.rosterQueries, 0);
	await assert.rejects(
		getClassroomRoster(fake.db, teacher, {
			...scope,
			classId: "another-class",
		}),
		{ code: "FORBIDDEN" },
	);
	await assert.rejects(
		getClassroomRoster(
			fake.db,
			{ ...teacher, activeSchoolId: "another-school" },
			scope,
		),
		{ code: "FORBIDDEN" },
	);
	await assert.rejects(
		confirmClassroom(fake.db, teacher, {
			...scope,
			termId: "another-term",
			records: [{ studentId: "one", status: "present", note: "" }],
		}),
		{ code: "BAD_REQUEST" },
	);
	await assert.rejects(
		confirmClassroom(fake.db, teacher, {
			...scope,
			records: [{ studentId: "another-pupil", status: "present", note: "" }],
		}),
		{ code: "BAD_REQUEST" },
	);
	assert.equal(fake.records.size, 0);
});

test("manual presence needs a note, absence can contradict a punch, and updates need permission", async () => {
	const { db, records } = fakeDatabase();
	await assert.rejects(
		confirmClassroom(db, teacher, {
			...scope,
			records: [{ studentId: "two", status: "present", note: "  " }],
		}),
		{ code: "BAD_REQUEST" },
	);
	assert.equal(records.size, 0);
	await confirmClassroom(db, teacher, {
		...scope,
		records: [{ studentId: "one", status: "absent", note: "" }],
	});
	assert.equal([...records.values()][0].status, "absent");
	await assert.rejects(
		confirmClassroom(
			db,
			{ ...teacher, permissions: ["attendance.record.create"] },
			{
				...scope,
				records: [{ studentId: "one", status: "present", note: "" }],
			},
		),
		{ code: "FORBIDDEN" },
	);
});

test("class scope, overview permissions, Tehran day boundaries and manual rules are explicit", () => {
	assert.equal(classAccessWhere(teacher).schoolId, "school");
	assert.deepEqual(classAccessWhere(teacher).OR?.[0], {
		homeroomTeacher: { userId: "teacher", schoolId: "school", deletedAt: null },
	});
	assert.equal(classAccessWhere(manager).OR, undefined);
	assert.throws(() => requireClassroomAccess(student), { code: "FORBIDDEN" });
	assert.throws(() => requirePermission(student, "attendance.record.read"), {
		code: "FORBIDDEN",
	});
	assert.throws(() => requirePermission(teacher, "attendance.record.read"), {
		code: "FORBIDDEN",
	});
	const { start, end } = tehranDay("2026-11-12");
	assert.equal(start.toISOString(), "2026-11-11T20:30:00.000Z");
	assert.equal(end.getTime() - start.getTime(), 86_400_000);
	assert.throws(() => tehranDay("2026-02-30"), { code: "BAD_REQUEST" });
	assert.equal(validateManualConfirmation("present", true, ""), false);
	assert.equal(
		validateManualConfirmation("present", false, "حضور در کلاس"),
		true,
	);
	assert.throws(() => validateManualConfirmation("excused", false, ""), {
		code: "BAD_REQUEST",
	});
});
