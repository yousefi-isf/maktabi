import assert from "node:assert/strict";
import test from "node:test";
import {
	DEVICE_STATUS_TTL_MS,
	deviceStatuses,
	expireDeviceStatuses,
	punchEvents,
	reportDeviceStatus,
} from "./events.js";

test("heartbeats refresh connection state and a crashed gateway expires to disconnected", () => {
	const school = "heartbeat-test";
	const events: string[] = [];
	const listener = (event: { schoolId: string; status: string }) => {
		if (event.schoolId === school) events.push(event.status);
	};
	punchEvents.on("deviceStatus", listener);
	try {
		reportDeviceStatus(school, "connected", 1000);
		reportDeviceStatus(school, "connected", 20_000);
		expireDeviceStatuses(1000 + DEVICE_STATUS_TTL_MS);
		assert.equal(deviceStatuses.get(school), "connected");
		expireDeviceStatuses(20_000 + DEVICE_STATUS_TTL_MS);
		assert.equal(deviceStatuses.get(school), "disconnected");
		expireDeviceStatuses(30_000 + DEVICE_STATUS_TTL_MS);
		assert.deepEqual(events, ["connected", "disconnected"]);
	} finally {
		punchEvents.off("deviceStatus", listener);
		deviceStatuses.delete(school);
	}
});
