import ZKLib from "node-zklib";
import { loadGatewayConfig } from "./config.js";
import { toPunch } from "./device-monitor.js";

async function run() {
	const config = loadGatewayConfig();
	process.env.TZ = config.timeZone;
	const device = new ZKLib(config.deviceIp, config.devicePort, 10_000, 5000);
	try {
		await device.createSocket();
		const users = await device.getUsers();
		console.log(
			"Device users:",
			users.data.map(({ userId, name, role }) => ({
				userId,
				name,
				deviceRole: role,
			})),
		);
		const logs = await device.getAttendances();
		console.log("Device log count:", logs.data.length);
		console.log(
			"Recent records (UTC):",
			logs.data.slice(-10).map((record) => toPunch(record, config)),
		);
	} finally {
		await device.disconnect();
	}
}
void run().catch((error) => {
	console.error(error instanceof Error ? error.message : "Device read failed.");
	process.exitCode = 1;
});
