import assert from "node:assert/strict";
import test from "node:test";
import type { Context } from "../../trpc/context.js";

// Importing the router constructs Prisma's client; these tests never connect it.
process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
const { subjectsRouter } = await import("./router.js");

const id = (number: number) =>
	`00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const subjectId = id(1);
type Subject = {
	id: string;
	schoolId: string;
	name: string;
	code: string;
	subjectType: string;
	defaultUnit: number;
	deletedAt: Date | null;
};
type Module = {
	id: string;
	schoolId: string;
	subjectId: string;
	title: string;
	orderIndex: number;
	weight: number;
	deletedAt: Date | null;
};
type Where = {
	id?: string | { in?: string[]; notIn?: string[] };
	schoolId?: string;
	subjectId?: string;
	deletedAt?: null;
};
function matches(row: Subject | Module, where: Where) {
	return (
		(typeof where.id === "string"
			? row.id === where.id
			: (!where.id?.in || where.id.in.includes(row.id)) &&
				(!where.id?.notIn || !where.id.notIn.includes(row.id))) &&
		(where.schoolId === undefined || row.schoolId === where.schoolId) &&
		(where.subjectId === undefined ||
			("subjectId" in row && row.subjectId === where.subjectId)) &&
		(where.deletedAt === undefined || row.deletedAt === null)
	);
}

function fixture() {
	let state = {
		subject: {
			id: subjectId,
			schoolId: "school-a",
			name: "Original",
			code: "100",
			subjectType: "modular",
			defaultUnit: 2,
			deletedAt: null,
		} as Subject,
		modules: [
			{ id: id(3), schoolId: "school-a", subjectId },
			{ id: id(4), schoolId: "school-a", subjectId },
			{ id: id(5), schoolId: "school-a", subjectId: id(2) },
			{ id: id(6), schoolId: "school-b", subjectId: id(2) },
			// School ownership is checked even if a legacy row has an inconsistent parent.
			{ id: id(7), schoolId: "school-b", subjectId },
			{ id: id(8), schoolId: "school-a", subjectId },
		].map((row) => ({
			...row,
			title: row.id,
			orderIndex: 1,
			weight: 1,
			deletedAt: row.id === id(8) ? new Date("2020-01-01") : null,
		})) as Module[],
	};
	let writes = 0;
	let captures = 0;
	const tx = {
		enrollment: {
			findMany: async () => {
				captures++;
				return [];
			},
		},
		subject: {
			update: async ({
				where,
				data,
			}: {
				where: Where;
				data: Partial<Subject>;
			}) => {
				if (!matches(state.subject, where))
					throw new Error("Subject not found");
				writes++;
				Object.assign(state.subject, data);
				return state.subject;
			},
		},
		subjectModule: {
			findMany: async ({ where }: { where: Where }) =>
				state.modules.filter((row) => matches(row, where)),
			updateMany: async ({
				where,
				data,
			}: {
				where: Where;
				data: Partial<Module>;
			}) => {
				writes++;
				for (const row of state.modules.filter((row) => matches(row, where)))
					Object.assign(row, data);
			},
			update: async ({
				where,
				data,
			}: {
				where: Where;
				data: Partial<Module>;
			}) => {
				const row = state.modules.find((row) => matches(row, where));
				if (!row) throw new Error("Module not found");
				writes++;
				Object.assign(row, data);
				return row;
			},
			create: async ({ data }: { data: Omit<Module, "id" | "deletedAt"> }) => {
				writes++;
				const row = { ...data, id: id(99), deletedAt: null };
				state.modules.push(row);
				return row;
			},
		},
	};
	const db = {
		subject: {
			findUnique: async ({ where }: { where: Where }) =>
				matches(state.subject, where) ? state.subject : null,
		},
		$transaction: async (run: (database: typeof tx) => Promise<unknown>) => {
			const original = structuredClone(state);
			try {
				return await run(tx);
			} catch (error) {
				state = original;
				throw error;
			}
		},
	};
	// Even platform administrators must respect the active school and parent subject.
	const api = subjectsRouter.createCaller({
		authSession: {
			user: { id: "admin", isSuperAdmin: true },
			session: { activeSchoolId: "school-a" },
		},
		prisma: db,
	} as unknown as Context);
	return {
		api,
		get state() {
			return state;
		},
		get writes() {
			return writes;
		},
		get captures() {
			return captures;
		},
	};
}

const moduleInput = (moduleId?: string) => ({
	id: moduleId,
	title: "Updated",
	orderIndex: 2,
	weight: 3,
});
const input = {
	id: subjectId,
	name: "Updated subject",
	code: "100",
	subjectType: "modular" as const,
	defaultUnit: 3,
};

for (const [name, invalidId] of [
	["a module of another subject in the same school", id(5)],
	["a module of another school", id(6)],
	["a module with mismatched school ownership", id(7)],
	["a deleted module", id(8)],
	["an unknown module", id(9)],
] as const) {
	test(`rejects ${name} before changing the subject, modules or GPA basis`, async () => {
		const f = fixture();
		const before = structuredClone(f.state);
		await assert.rejects(
			f.api.update({
				...input,
				modules: [moduleInput(id(3)), moduleInput(invalidId)],
			}),
			{ code: "BAD_REQUEST" },
		);
		assert.deepEqual(f.state, before);
		assert.equal(f.writes, 0);
		assert.equal(f.captures, 0);
	});
}

test("rejects duplicate module IDs before any changes", async () => {
	const f = fixture();
	await assert.rejects(
		f.api.update({
			...input,
			modules: [moduleInput(id(3)), moduleInput(id(3))],
		}),
		{ code: "BAD_REQUEST" },
	);
	assert.equal(f.writes, 0);
	assert.equal(f.captures, 0);
});

test("valid updates can edit, add and omit modules without changing other schools or subjects", async () => {
	const f = fixture();
	const untouched = structuredClone(f.state.modules.slice(2));
	await f.api.update({
		...input,
		modules: [moduleInput(id(3)), moduleInput()],
	});
	assert.equal(f.state.subject.defaultUnit, 3);
	assert.equal(f.state.modules.find((row) => row.id === id(3))!.weight, 3);
	assert.ok(f.state.modules.find((row) => row.id === id(4))!.deletedAt);
	assert.equal(
		f.state.modules.find((row) => row.id === id(99))!.schoolId,
		"school-a",
	);
	assert.equal(
		f.state.modules.find((row) => row.id === id(99))!.subjectId,
		subjectId,
	);
	assert.deepEqual(f.state.modules.slice(2, 6), untouched);
	assert.equal(f.captures, 1);
});

test("rejects foreign module IDs even when changing the subject to theoretical", async () => {
	const f = fixture();
	await assert.rejects(
		f.api.update({
			...input,
			subjectType: "theoretical",
			modules: [moduleInput(id(5))],
		}),
		{ code: "BAD_REQUEST" },
	);
	assert.equal(f.writes, 0);
});
