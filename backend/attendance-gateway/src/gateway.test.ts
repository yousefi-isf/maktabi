import assert from "node:assert/strict";
import test from "node:test";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseGatewayConfig } from "./config.js";
import { DurableOutbox, punchKey, type GatewayPunch } from "./outbox.js";
import { BackendClient, OutboxDelivery } from "./backend-client.js";
import { DeviceMonitor, toPunch } from "./device-monitor.js";
import { buildGatewayApp } from "./server.js";
import { acquireGatewayLock } from "./lock.js";

const config = parseGatewayConfig({
	SCHOOL_ID: "11111111-1111-4111-8111-111111111111",
	GATEWAY_SECRET: "test-secret-123456789",
	GATEWAY_API_TOKEN: "test-api-token-123456789",
});
const punch: GatewayPunch = {
	schoolId: config.schoolId,
	deviceIp: config.deviceIp,
	deviceUserId: "110080119",
	recordTime: "2026-11-12T10:05:52.000Z",
	deviceSn: 174,
};
const receipt = (record: GatewayPunch) => ({
	id: punchKey(record),
	schoolId: record.schoolId,
	recordTime: record.recordTime,
	studentId: "student",
	studentName: "Younes",
	alreadyExists: false,
});
async function temporary(operation: (path: string) => Promise<void>) {
	const directory = await mkdtemp(join(tmpdir(), "maktabi-gateway-"));
	try {
		await operation(join(directory, "outbox.jsonl"));
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

test("configuration rejects missing school/secret, invalid URLs and unprotected LAN binding", () => {
	assert.throws(() => parseGatewayConfig({}), /GATEWAY_SECRET/);
	assert.throws(
		() => parseGatewayConfig({ GATEWAY_SECRET: config.secret }),
		/SCHOOL_ID/,
	);
	assert.throws(
		() =>
			parseGatewayConfig({
				GATEWAY_SECRET: config.secret,
				SCHOOL_ID: config.schoolId,
				GATEWAY_HOST: "0.0.0.0",
			}),
		/GATEWAY_API_TOKEN/,
	);
	assert.throws(
		() =>
			parseGatewayConfig({
				GATEWAY_SECRET: config.secret,
				SCHOOL_ID: config.schoolId,
				BACKEND_URL: "file:///tmp",
			}),
		/BACKEND_URL/,
	);
	assert.equal(config.timeZone, "Asia/Tehran");
});

test("a second gateway cannot read or truncate an active process's journal", async () =>
	temporary(async (path) => {
		const release = await acquireGatewayLock(path);
		await assert.rejects(acquireGatewayLock(path), /Another gateway process/);
		await release();
		const acquiredAgain = await acquireGatewayLock(path);
		await acquiredAgain();
	}));

test("repeated device user UID is not an event key; journal survives restart and keeps failed sends", async () =>
	temporary(async (path) => {
		let queue = await DurableOutbox.load(path);
		const second = { ...punch, recordTime: "2026-11-12T11:05:52.000Z" };
		assert.notEqual(punchKey(punch), punchKey(second));
		assert.equal(await queue.enqueue([punch, second, punch]), 2);
		queue = await DurableOutbox.load(path);
		assert.equal(queue.size, 2);
		const failing = new OutboxDelivery(queue, {
			sendPunch: async () => {
				throw new Error("offline");
			},
		});
		await failing.flush();
		assert.equal(queue.size, 2);
		queue = await DurableOutbox.load(path);
		const sender = new OutboxDelivery(queue, {
			sendPunch: async (record) => receipt(record),
		});
		await sender.flush();
		assert.equal(queue.size, 0);
		queue = await DurableOutbox.load(path);
		assert.equal(await queue.enqueue([punch, second]), 0);
		assert.equal(queue.size, 0);
		assert.ok(!(await readFile(path, "utf8")).includes(config.secret));
	}));

test("crash-truncated journal is repaired before append; complete corruption fails visibly", async () =>
	temporary(async (path) => {
		const queue = await DurableOutbox.load(path);
		await queue.enqueue([punch]);
		await appendFile(path, '{"type":"ack"');
		const recovered = await DurableOutbox.load(path);
		assert.equal(recovered.size, 1);
		await recovered.acknowledge(punchKey(punch));
		assert.equal((await DurableOutbox.load(path)).size, 0);
		await writeFile(path, '{"type":"not-an-event"}\n');
		await assert.rejects(DurableOutbox.load(path), /Invalid gateway outbox/);
	}));

test("initial connection and reconnect replay history, repeated UIDs and lower UIDs; HTTP diagnostics never issue device commands", async () =>
	temporary(async (path) => {
		const queue = await DurableOutbox.load(path);
		const records = [
			{
				userSn: 174,
				deviceUserId: "110080119",
				recordTime: new Date(punch.recordTime),
			},
		];
		let connected = 0;
		const device = {
			createSocket: async () => {
				connected++;
			},
			disconnect: async () => {},
			getInfo: async () => ({ logCounts: records.length }),
			getAttendances: async () => ({ data: records }),
			getUsers: async () => ({ data: [] }),
		};
		const monitor = new DeviceMonitor(
			config,
			queue,
			() => device,
			() => {},
		);
		await monitor.poll();
		assert.equal(queue.size, 1);
		records.push({
			...records[0],
			recordTime: new Date("2026-11-12T12:05:52Z"),
		});
		records.push({
			userSn: 10,
			deviceUserId: "4",
			recordTime: new Date("2026-11-12T12:06:52Z"),
		});
		await monitor.poll();
		assert.equal(queue.size, 3);
		assert.equal(monitor.recent[2].deviceUserId, "000000004");
		await monitor.disconnect();
		records.push({
			...records[0],
			recordTime: new Date("2026-11-12T13:05:52Z"),
		});
		await monitor.poll();
		assert.equal(queue.size, 4);
		assert.equal(connected, 2);
		const delivery = new OutboxDelivery(queue, {
			sendPunch: async (record) => receipt(record),
		});
		const app = buildGatewayApp(config, monitor, queue, delivery, {
			lastSuccessAt: Date.now(),
			error: null,
		});
		assert.equal((await app.inject({ url: "/device/users" })).statusCode, 401);
		assert.equal(
			(
				await app.inject({
					url: "/device/logs/recent",
					headers: { authorization: `Bearer ${config.apiToken}` },
				})
			).json().recent.length,
			4,
		);
		assert.equal((await app.inject({ url: "/health" })).statusCode, 200);
		await app.close();
		await monitor.disconnect();
	}));

test("full rescan detects changed logs even when the device count does not increase", async () =>
	temporary(async (path) => {
		const queue = await DurableOutbox.load(path);
		let record = {
			userSn: 174,
			deviceUserId: "110080119",
			recordTime: new Date(punch.recordTime),
		};
		const monitor = new DeviceMonitor(
			config,
			queue,
			() => ({
				createSocket: async () => {},
				disconnect: async () => {},
				getInfo: async () => ({ logCounts: 1 }),
				getAttendances: async () => ({ data: [record] }),
				getUsers: async () => ({ data: [] }),
			}),
			() => {},
		);
		await monitor.poll(1000);
		record = { ...record, recordTime: new Date("2026-11-13T10:05:52Z") };
		await monitor.poll(1000 + config.rescanIntervalMs);
		assert.equal(queue.size, 2);
	}));

test("backend errors and invalid success responses do not acknowledge events, requests have a timeout signal", async () => {
	const request = (async (_url, options) => {
		assert.ok(options?.signal);
		return new Response("{}", { status: 503 });
	}) as typeof fetch;
	await assert.rejects(
		new BackendClient(config, request).sendPunch(punch),
		/503/,
	);
	const malformed = (async () =>
		new Response("{}", { status: 200 })) as typeof fetch;
	await assert.rejects(
		new BackendClient(config, malformed).sendPunch(punch),
		/acknowledge/,
	);
});

test("device wall-clock uses Tehran instead of host timezone, and invalid timestamps never become now", () => {
	const oldZone = process.env.TZ;
	try {
		process.env.TZ = config.timeZone;
		const event = toPunch(
			{
				deviceUserId: "۱۱۰۰۸۰۱۱۹",
				recordTime: new Date(2026, 10, 12, 13, 35, 52),
			},
			config,
		);
		assert.equal(event.recordTime, "2026-11-12T10:05:52.000Z");
		assert.equal(event.deviceSn, null);
		assert.throws(
			() => toPunch({ deviceUserId: "4", recordTime: new Date(NaN) }, config),
			/invalid attendance time/,
		);
	} finally {
		if (oldZone === undefined) delete process.env.TZ;
		else process.env.TZ = oldZone;
	}
});
