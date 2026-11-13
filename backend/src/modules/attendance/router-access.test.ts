import assert from "node:assert/strict";
import { after, test } from "node:test";

// The client is instantiated for middleware mocking; no connection is made.
process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
const { prisma } = await import("@maktabi/db");
const { attendanceRouter } = await import("./router.js");
const { rankingsRouter } = await import("../rankings/router.js");

let permissions: string[] = [];
const originalFind = prisma.userSchool.findFirst;
prisma.userSchool.findFirst = (async () => ({
	school: { id: "school", name: "school" },
	userRoles: [
		{
			role: {
				name: "test-role",
				rolePermissions: permissions.map((code) => ({ permission: { code } })),
			},
		},
	],
})) as unknown as typeof prisma.userSchool.findFirst;
after(async () => {
	prisma.userSchool.findFirst = originalFind;
	await prisma.$disconnect();
});

function caller() {
	return attendanceRouter.createCaller({
		authSession: {
			user: { id: "user", isSuperAdmin: false },
			session: { id: "session", activeSchoolId: "school" },
		},
		prisma: {
			devicePunchLog: {
				findMany: () => {
					throw new Error("Unauthorized query reached database");
				},
			},
			schoolClass: {
				findMany: async ({ where }: any) => {
					assert.equal(where.schoolId, "school");
					assert.ok(where.OR);
					return [];
				},
			},
		},
	} as never);
}

test("student cannot call dashboard, raw logs, subscriptions, classroom or staff APIs directly", async () => {
	permissions = ["attendance.record.read.own", "assessment.score.read.own"];
	const api = caller();
	for (const operation of [
		() => api.punchLogs.list({}),
		() => api.punchLogs.todaySummary(),
		() => api.punchLogs.history({}),
		() => api.deviceStatus.current(),
		() => api.punchLogs.subscribe(),
		() => api.deviceStatus.subscribe(),
		() => api.classroom.classes(),
		() => api.classroom.teachers.list(),
	])
		await assert.rejects(operation, { code: "FORBIDDEN" });
});

test("teacher can query their scoped class list but cannot query school-wide logs or manage teachers", async () => {
	permissions = ["attendance.record.create", "attendance.record.update"];
	const api = caller();
	assert.deepEqual(await api.classroom.classes(), []);
	await assert.rejects(api.punchLogs.list({}), { code: "FORBIDDEN" });
	await assert.rejects(api.classroom.teachers.list(), { code: "FORBIDDEN" });
});

test("student cannot call school-wide ranking APIs used by the dashboard", async () => {
	permissions = ["attendance.record.read.own", "assessment.score.read.own"];
	const api = rankingsRouter.createCaller({
		authSession: {
			user: { id: "user", isSuperAdmin: false },
			session: { id: "session", activeSchoolId: "school" },
		},
		prisma: {},
	} as never);
	await assert.rejects(api.getFilterOptions(), { code: "FORBIDDEN" });
	await assert.rejects(api.getStudentRankings({ academicYearId: "year" }), {
		code: "FORBIDDEN",
	});
	await assert.rejects(
		api.getStudentScoreDetail({ studentId: "student", academicYearId: "year" }),
		{ code: "FORBIDDEN" },
	);
});
