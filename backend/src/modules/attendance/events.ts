import { EventEmitter } from "node:events";

export const punchEvents = new EventEmitter();
export const deviceStatuses = new Map<string, "connected" | "disconnected">();
const lastReports = new Map<string, number>();
export const DEVICE_STATUS_TTL_MS = 45_000;

export function reportDeviceStatus(
	schoolId: string,
	status: "connected" | "disconnected",
	now = Date.now(),
) {
	lastReports.set(schoolId, now);
	const changed = deviceStatuses.get(schoolId) !== status;
	deviceStatuses.set(schoolId, status);
	if (changed) punchEvents.emit("deviceStatus", { schoolId, status });
}

export function expireDeviceStatuses(now = Date.now()) {
	for (const [schoolId, reportedAt] of lastReports) {
		if (
			deviceStatuses.get(schoolId) === "connected" &&
			now - reportedAt >= DEVICE_STATUS_TTL_MS
		) {
			deviceStatuses.set(schoolId, "disconnected");
			punchEvents.emit("deviceStatus", { schoolId, status: "disconnected" });
		}
	}
}

export function currentDeviceStatus(schoolId: string) {
	expireDeviceStatuses();
	return deviceStatuses.get(schoolId) ?? "unknown";
}
