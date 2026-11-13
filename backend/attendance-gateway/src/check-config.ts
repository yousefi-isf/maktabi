import { loadGatewayConfig } from "./config.js";

try {
	const config = loadGatewayConfig();
	console.log({
		backendUrl: config.backendUrl,
		schoolId: config.schoolId,
		device: `${config.deviceIp}:${config.devicePort}`,
		deviceTimeZone: config.timeZone,
		sharedSecret: "configured (not displayed)",
		diagnosticToken: config.apiToken
			? "configured (not displayed)"
			: "disabled",
		outboxPath: config.outboxPath,
	});
} catch (error) {
	console.error(
		error instanceof Error ? error.message : "Invalid configuration.",
	);
	process.exitCode = 1;
}
