import type { GatewayConfig } from "./config.js";
import {
	DurableOutbox,
	normalizeDeviceUserId,
	type GatewayPunch,
} from "./outbox.js";

export interface DeviceRecord {
	deviceUserId: string | number;
	recordTime: Date;
	userSn?: number;
}
export interface DeviceUser {
	userId: string | number;
	name?: string;
	role?: number;
}
export interface AttendanceDevice {
	createSocket(
		onError?: (error: Error) => void,
		onClose?: () => void,
	): Promise<void>;
	disconnect(): Promise<void>;
	getInfo(): Promise<{ logCounts: number }>;
	getAttendances(): Promise<{ data: DeviceRecord[]; err?: unknown }>;
	getUsers(): Promise<{ data: DeviceUser[]; err?: unknown }>;
}

export function toPunch(
	record: DeviceRecord,
	config: Pick<GatewayConfig, "schoolId" | "deviceIp">,
): GatewayPunch {
	if (
		!(record.recordTime instanceof Date) ||
		!Number.isFinite(record.recordTime.getTime())
	)
		throw new Error(
			"Device returned an invalid attendance time; no replacement time will be invented.",
		);
	return {
		schoolId: config.schoolId,
		deviceIp: config.deviceIp,
		deviceUserId: normalizeDeviceUserId(record.deviceUserId),
		recordTime: record.recordTime.toISOString(),
		deviceSn:
			Number.isInteger(record.userSn) && record.userSn! >= 0
				? record.userSn!
				: null,
	};
}

/** One awaited poll at a time owns all SDK commands. Diagnostic HTTP routes use these caches. */
export class DeviceMonitor {
	connected = false;
	totalLogs = 0;
	users: DeviceUser[] = [];
	recent: GatewayPunch[] = [];
	private device: AttendanceDevice | null = null;
	private generation = 0;
	private previousCount = -1;
	private lastScanAt = 0;
	private lastUsersAt = 0;
	private running = false;
	constructor(
		private config: GatewayConfig,
		private outbox: DurableOutbox,
		private createDevice: () => AttendanceDevice,
		private log: (message: string) => void = console.log,
	) {}

	async poll(now = Date.now()) {
		if (this.running) return;
		this.running = true;
		try {
			if (!this.device || !this.connected) {
				await this.disconnect();
				const generation = ++this.generation;
				const device = this.createDevice();
				this.device = device;
				let closed = false;
				const dropped = () => {
					closed = true;
					if (generation === this.generation) this.connected = false;
				};
				await device.createSocket(dropped, dropped);
				if (generation !== this.generation) return;
				if (closed) throw new Error("Connection closed during setup.");
				this.connected = true;
				this.previousCount = -1;
				this.log(
					"[Device] Connected; replaying device history through the durable outbox.",
				);
			}
			const device = this.device;
			if (!device) throw new Error("No connected device.");
			const info = await device.getInfo();
			if (!Number.isInteger(info.logCounts) || info.logCounts < 0)
				throw new Error("Invalid device log count.");
			if (
				info.logCounts !== this.previousCount ||
				now - this.lastScanAt >= this.config.rescanIntervalMs
			) {
				const response = await device.getAttendances();
				if (!Array.isArray(response?.data))
					throw new Error("Device did not return attendance data.");
				const punches: GatewayPunch[] = [];
				let invalid = 0;
				for (const record of response.data) {
					try {
						punches.push(toPunch(record, this.config));
					} catch {
						invalid++;
					}
				}
				punches.sort((a, b) => a.recordTime.localeCompare(b.recordTime));
				// Persist before advancing any polling state. Connection/restart history is never discarded.
				const added = await this.outbox.enqueue(punches);
				if (invalid)
					throw new Error(
						`Device returned ${invalid} invalid events. Valid events are queued; fix invalid device IDs/times to recover the remaining events.`,
					);
				if (response.err)
					throw new Error("Device returned incomplete attendance data.");
				this.recent = punches.slice(-10);
				this.totalLogs = info.logCounts;
				this.previousCount = info.logCounts;
				this.lastScanAt = now;
				if (added)
					this.log(
						`[Device] Queued ${added} new attendance events; ${this.outbox.size} awaiting backend acknowledgement.`,
					);
			}
			if (now - this.lastUsersAt >= 300_000 || this.lastUsersAt === 0) {
				this.lastUsersAt = now;
				try {
					const response = await device.getUsers();
					if (response.err || !Array.isArray(response?.data))
						throw new Error("Incomplete user data.");
					this.users = response.data.map((user) => ({
						userId: normalizeDeviceUserId(user.userId),
						name: user.name?.trim(),
						role: user.role,
					}));
				} catch {
					this.log(
						"[Device] User names could not be refreshed; attendance matching is performed by the backend.",
					);
				}
			}
		} catch (error) {
			this.log(
				`[Device] ${error instanceof Error ? error.message : "Read failed."} Retrying connection.`,
			);
			await this.disconnect();
		} finally {
			this.running = false;
		}
	}

	async disconnect() {
		++this.generation;
		this.connected = false;
		const device = this.device;
		this.device = null;
		if (device) {
			try {
				await device.disconnect();
			} catch {}
		}
	}
}
