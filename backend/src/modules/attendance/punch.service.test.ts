import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@maktabi/db";

process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
const { processDevicePunch, normalizePunchUserId } = await import(
	"./punch.service.js"
);

function database() {
	const students = [
		{
			id: "student",
			schoolId: "school",
			nationalCode: "1100801197",
			fullName: "یونس ابراهیمی",
		},
	];
	const rows: any[] = [];
	const include = (row: any) => {
		const student = students.find((student) => student.id === row.studentId);
		return {
			...row,
			student: student ? { userSchool: { user: student } } : null,
		};
	};
	const identity = (row: any, event: any) =>
		row.schoolId === event.schoolId &&
		row.deviceIp === event.deviceIp &&
		row.deviceUserId === event.deviceUserId &&
		+row.recordTime === +event.recordTime;
	const db = {
		school: {
			findFirst: async ({ where }: any) =>
				where.id === "inactive" ? null : { id: where.id },
		},
		student: {
			findMany: async ({ where, take }: any) => {
				assert.equal(where.userSchool.status, "active");
				assert.equal(where.userSchool.deletedAt, null);
				const code = where.userSchool.user.nationalCode;
				return students
					.filter(
						(student) =>
							student.schoolId === where.schoolId &&
							(typeof code === "string"
								? student.nationalCode === code
								: student.nationalCode.startsWith(code.startsWith)),
					)
					.slice(0, take)
					.map((student) => ({
						id: student.id,
						userSchool: { user: student },
					}));
			},
		},
		devicePunchLog: {
			findFirst: async ({ where }: any) => {
				const row = rows.find(
					(row) =>
						identity(row, { ...where, deviceUserId: row.deviceUserId }) &&
						where.deviceUserId.in.includes(row.deviceUserId),
				);
				return row ? include(row) : null;
			},
			findUnique: async ({ where }: any) => {
				const row = rows.find((row) => identity(row, where.event));
				return row ? include(row) : null;
			},
			create: async ({ data }: any) => {
				if (rows.some((row) => identity(row, data)))
					throw Object.assign(new Error("Duplicate event"), { code: "P2002" });
				const row = { id: `log-${rows.length}`, ...data };
				rows.push(row);
				return include(row);
			},
			update: async ({ where, data }: any) => {
				const row = rows.find((row) => row.id === where.id);
				Object.assign(row, data);
				return include(row);
			},
		},
	};
	return { db: db as unknown as PrismaClient, students, rows };
}
const payload = {
	schoolId: "school",
	deviceIp: "192.168.2.201",
	deviceUserId: "110080119",
	deviceSn: 174,
	recordTime: "2026-11-12T10:05:52.000Z",
	secret: "unused",
};

test("nine-digit device ID resolves Younes and replay returns the same student identity", async () => {
	const { db, rows } = database();
	const first = await processDevicePunch(db, payload);
	assert.equal(first.studentName, "یونس ابراهیمی");
	assert.equal(first.nationalCode, "1100801197");
	assert.equal(first.alreadyExists, false);
	const replay = await processDevicePunch(db, payload);
	assert.equal(replay.id, first.id);
	assert.equal(replay.studentName, first.studentName);
	assert.equal(replay.alreadyExists, true);
	assert.equal(rows.length, 1);
});

test("repeated userSn at different times and different schools produces independent events", async () => {
	const { db, rows } = database();
	await processDevicePunch(db, payload);
	await processDevicePunch(db, {
		...payload,
		recordTime: "2026-11-12T11:05:52Z",
	});
	const other = await processDevicePunch(db, {
		...payload,
		schoolId: "other-school",
	});
	assert.equal(other.studentId, null);
	assert.equal(rows.length, 3);
});

test("concurrent replay creates one event", async () => {
	const { db, rows } = database();
	const results = await Promise.all([
		processDevicePunch(db, payload),
		processDevicePunch(db, payload),
	]);
	assert.equal(rows.length, 1);
	assert.equal(new Set(results.map((result) => result.id)).size, 1);
	assert.equal(results.filter((result) => result.alreadyExists).length, 1);
});

test("unknown punch can be linked on replay after student registration; ambiguous IDs remain unlinked", async () => {
	const { db, students, rows } = database();
	const student = students.pop()!;
	assert.equal((await processDevicePunch(db, payload)).studentId, null);
	students.push(student);
	assert.equal((await processDevicePunch(db, payload)).studentId, student.id);
	assert.equal(rows.length, 1);
	students.push({
		...student,
		id: "duplicate-prefix",
		nationalCode: "1100801191",
	});
	assert.equal(
		(
			await processDevicePunch(db, {
				...payload,
				recordTime: "2026-11-12T12:05:52Z",
			})
		).studentId,
		null,
	);
});

test("exact full national codes, leading zeros and absent UDP userSn are supported", async () => {
	const { db, rows } = database();
	assert.equal(
		(
			await processDevicePunch(db, {
				...payload,
				deviceUserId: "1100801197",
				deviceSn: undefined,
			})
		).studentId,
		"student",
	);
	assert.equal(rows[0].deviceSn, null);
	assert.equal(normalizePunchUserId("۴"), "000000004");
	assert.equal(normalizePunchUserId("1100801197"), "1100801197");
});

test("malformed timestamps, IDs and inactive school configuration cannot create punches", async () => {
	const { db, rows } = database();
	await assert.rejects(
		processDevicePunch(db, { ...payload, recordTime: "invalid" }),
	);
	await assert.rejects(
		processDevicePunch(db, { ...payload, deviceUserId: "110*" }),
	);
	await assert.rejects(
		processDevicePunch(db, { ...payload, schoolId: "inactive" }),
	);
	assert.equal(rows.length, 0);
});
