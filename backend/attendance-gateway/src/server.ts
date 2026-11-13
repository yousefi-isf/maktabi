import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import Fastify from "fastify";
import ZKLib from "node-zklib";
import { loadGatewayConfig, type GatewayConfig } from "./config.js";
import { DurableOutbox } from "./outbox.js";
import { BackendClient, OutboxDelivery } from "./backend-client.js";
import { DeviceMonitor, type AttendanceDevice } from "./device-monitor.js";
import { acquireGatewayLock } from "./lock.js";

export function buildGatewayApp(
	config: GatewayConfig,
	monitor: DeviceMonitor,
	outbox: DurableOutbox,
	delivery: OutboxDelivery,
	heartbeat: { lastSuccessAt: number | null; error: string | null },
) {
	const app = Fastify({ logger: false });
	app.addHook("onRequest", async (request, reply) => {
		if (request.url.split("?")[0] === "/health") return;
		const expected = config.apiToken
			? Buffer.from(`Bearer ${config.apiToken}`)
			: null;
		const supplied = Buffer.from(request.headers.authorization || "");
		if (
			!expected ||
			expected.length !== supplied.length ||
			!timingSafeEqual(expected, supplied)
		) {
			return reply
				.code(401)
				.send({
					error: "A configured GATEWAY_API_TOKEN bearer token is required.",
				});
		}
	});
	app.get("/health", async (_request, reply) => {
		const backendReachable =
			heartbeat.lastSuccessAt !== null &&
			Date.now() - heartbeat.lastSuccessAt < 35_000;
		const healthy =
			monitor.connected && backendReachable && !delivery.lastError;
		return reply
			.code(healthy ? 200 : 503)
			.send({
				status: healthy ? "ok" : "degraded",
				deviceConnected: monitor.connected,
				backendReachable,
				pendingEvents: outbox.size,
			});
	});
	app.get("/device/users", async () => ({
		total: monitor.users.length,
		users: monitor.users,
	}));
	app.get("/device/logs/recent", async () => ({
		total: monitor.totalLogs,
		connected: monitor.connected,
		recent: monitor.recent,
	}));
	return app;
}

export async function startGateway() {
	const config = loadGatewayConfig();
	// node-zklib constructs local Date objects from the device's wall-clock fields.
	// Set the process timezone before any SDK read, irrespective of the host timezone.
	process.env.TZ = config.timeZone;
	const releaseLock = await acquireGatewayLock(config.outboxPath);
	let outbox: DurableOutbox;
	try {
		outbox = await DurableOutbox.load(config.outboxPath);
	} catch (error) {
		await releaseLock();
		throw error;
	}
	if (
		outbox.pending.some(
			({ punch }) =>
				punch.schoolId !== config.schoolId ||
				punch.deviceIp !== config.deviceIp,
		)
	) {
		await releaseLock();
		throw new Error(
			"Pending outbox events belong to another device/school. Use a separate GATEWAY_DATA_DIR; preserve the existing queue.",
		);
	}
	const client = new BackendClient(config);
	const delivery = new OutboxDelivery(outbox, client, (receipt) => {
		console.log(
			`[Sync] ${receipt.alreadyExists ? "Already saved" : "Saved"}: ${receipt.studentName || "No matching student in the school"} at ${receipt.recordTime}`,
		);
	});
	const monitor = new DeviceMonitor(
		config,
		outbox,
		() =>
			new ZKLib(
				config.deviceIp,
				config.devicePort,
				10_000,
				5000,
			) as AttendanceDevice,
	);
	const heartbeat = {
		lastSuccessAt: null as number | null,
		error: null as string | null,
	};
	const app = buildGatewayApp(config, monitor, outbox, delivery, heartbeat);
	try {
		await app.listen({ port: config.port, host: config.host });
	} catch (error) {
		await releaseLock();
		throw error;
	}
	console.log(
		`[Gateway] Listening on ${config.host}:${config.port}. Device timezone: ${config.timeZone}. Pending events: ${outbox.size}.`,
	);
	const controller = new AbortController();
	const pause = (ms: number) =>
		sleep(ms, undefined, { signal: controller.signal }).catch((error) => {
			if (error.name !== "AbortError") throw error;
		});
	const deviceWorker = (async () => {
		while (!controller.signal.aborted) {
			await monitor.poll();
			await pause(monitor.connected ? config.pollIntervalMs : 5000);
		}
	})();
	const deliveryWorker = (async () => {
		let previousError: string | null = null;
		while (!controller.signal.aborted) {
			await delivery.flush();
			if (delivery.lastError && delivery.lastError !== previousError)
				console.warn(
					`[Sync] ${delivery.lastError} Events remain in the durable queue for retry.`,
				);
			previousError = delivery.lastError;
			await pause(1000);
		}
	})();
	const heartbeatWorker = (async () => {
		while (!controller.signal.aborted) {
			const status = monitor.connected ? "connected" : "disconnected";
			try {
				await client.sendStatus(status);
				heartbeat.lastSuccessAt = Date.now();
				heartbeat.error = null;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Heartbeat failed.";
				if (heartbeat.error !== message) console.warn(`[Heartbeat] ${message}`);
				heartbeat.error = message;
			}
			if (status === (monitor.connected ? "connected" : "disconnected"))
				await pause(10_000);
		}
	})();
	let shutdown: Promise<void> | undefined;
	const stop = () =>
		(shutdown ??= (async () => {
			controller.abort();
			delivery.stop();
			await Promise.allSettled([deviceWorker, deliveryWorker, heartbeatWorker]);
			await monitor.disconnect();
			try {
				await client.sendStatus("disconnected");
			} catch {}
			await outbox.close();
			await app.close();
			await releaseLock();
		})());
	const onSignal = () => {
		void stop().catch((error) => {
			console.error(error);
			process.exitCode = 1;
		});
	};
	process.once("SIGINT", onSignal);
	process.once("SIGTERM", onSignal);
	for (const worker of [deviceWorker, deliveryWorker, heartbeatWorker]) {
		void worker.catch((error) => {
			console.error("[Gateway] Worker failed; shutting down safely.", error);
			process.exitCode = 1;
			void stop();
		});
	}
	return { app, stop };
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	void startGateway().catch((error) => {
		console.error(
			`[Gateway] ${error instanceof Error ? error.message : "Startup failed."}`,
		);
		process.exitCode = 1;
	});
}
