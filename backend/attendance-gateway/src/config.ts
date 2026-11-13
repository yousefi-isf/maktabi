import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

export function readEnvironmentFile(
	path: string,
): Record<string, string | undefined> {
	try {
		return parseEnv(readFileSync(path, "utf8"));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw new Error(`Cannot read gateway configuration file: ${path}`, {
			cause: error,
		});
	}
}

export function parseGatewayConfig(values: Record<string, string | undefined>) {
	const required = (key: string) => {
		const value = values[key]?.trim();
		if (!value)
			throw new Error(
				`Missing ${key}. Configure attendance-gateway/.env or the process environment.`,
			);
		return value;
	};
	const integer = (key: string, fallback: number, min = 1, max = 65_535) => {
		const value = values[key] === undefined ? fallback : Number(values[key]);
		if (!Number.isInteger(value) || value < min || value > max)
			throw new Error(`Invalid ${key}.`);
		return value;
	};
	const secret = required("GATEWAY_SECRET");
	if (secret.length < 16)
		throw new Error(
			"GATEWAY_SECRET must contain at least 16 characters and match the backend.",
		);
	const schoolId = required("SCHOOL_ID");
	if (
		!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(schoolId)
	)
		throw new Error("SCHOOL_ID must be a school UUID.");
	const backendUrl = new URL(
		values.BACKEND_URL || `http://127.0.0.1:${integer("PORT", 4000)}`,
	);
	if (
		!["http:", "https:"].includes(backendUrl.protocol) ||
		backendUrl.username ||
		backendUrl.password ||
		backendUrl.search ||
		backendUrl.hash
	)
		throw new Error("Invalid BACKEND_URL.");
	const timeZone = values.DEVICE_TIME_ZONE || "Asia/Tehran";
	try {
		new Intl.DateTimeFormat("en", { timeZone });
	} catch {
		throw new Error("Invalid DEVICE_TIME_ZONE.");
	}
	const host = values.GATEWAY_HOST || "127.0.0.1";
	const apiToken = values.GATEWAY_API_TOKEN?.trim();
	if (apiToken && apiToken.length < 16)
		throw new Error("GATEWAY_API_TOKEN must contain at least 16 characters.");
	if (!["127.0.0.1", "::1", "localhost"].includes(host) && !apiToken)
		throw new Error(
			"GATEWAY_API_TOKEN is required when GATEWAY_HOST is not loopback.",
		);
	return {
		deviceIp: values.DEVICE_IP || "192.168.2.201",
		devicePort: integer("DEVICE_PORT", 4370),
		backendUrl: backendUrl.toString().replace(/\/$/, ""),
		secret,
		schoolId,
		timeZone,
		host,
		apiToken,
		port: integer("GATEWAY_PORT", 3002),
		pollIntervalMs: integer("POLL_INTERVAL_MS", 1500, 250, 60_000),
		rescanIntervalMs: integer("RESCAN_INTERVAL_MS", 60_000, 1000, 3_600_000),
		httpTimeoutMs: integer("HTTP_TIMEOUT_MS", 8000, 100, 60_000),
		outboxPath: resolve(
			values.GATEWAY_DATA_DIR ||
				fileURLToPath(new URL("../data", import.meta.url)),
			"outbox.jsonl",
		),
	};
}

export type GatewayConfig = ReturnType<typeof parseGatewayConfig>;

export function loadGatewayConfig() {
	return parseGatewayConfig({
		...readEnvironmentFile(
			fileURLToPath(new URL("../../.env", import.meta.url)),
		),
		...readEnvironmentFile(fileURLToPath(new URL("../.env", import.meta.url))),
		...process.env,
	});
}
