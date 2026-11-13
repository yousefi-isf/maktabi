import type { GatewayConfig } from "./config.js";
import { DurableOutbox, type GatewayPunch } from "./outbox.js";

export interface PunchReceipt {
	id: string;
	schoolId: string;
	studentId: string | null;
	studentName: string | null;
	recordTime: string;
	alreadyExists: boolean;
}

export class BackendHttpError extends Error {
	constructor(public status: number) {
		super(`Backend returned HTTP ${status}.`);
	}
}

export class BackendClient {
	constructor(
		private config: GatewayConfig,
		private request: typeof fetch = fetch,
	) {}
	private async post(path: string, payload: object) {
		const response = await this.request(`${this.config.backendUrl}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...payload, secret: this.config.secret }),
			signal: AbortSignal.timeout(this.config.httpTimeoutMs),
		});
		if (!response.ok) {
			await response.body?.cancel();
			throw new BackendHttpError(response.status);
		}
		return response.json();
	}
	async sendPunch(punch: GatewayPunch): Promise<PunchReceipt> {
		const data = await this.post("/internal/device/punch", punch);
		if (
			!data ||
			typeof data.id !== "string" ||
			data.schoolId !== punch.schoolId ||
			data.recordTime !== punch.recordTime ||
			typeof data.alreadyExists !== "boolean" ||
			!(data.studentId === null || typeof data.studentId === "string")
		) {
			throw new Error(
				"Backend did not acknowledge the expected attendance event.",
			);
		}
		return data;
	}
	async sendStatus(status: "connected" | "disconnected") {
		const data = await this.post("/internal/device/status", {
			schoolId: this.config.schoolId,
			status,
		});
		if (data?.success !== true)
			throw new Error("Backend did not acknowledge device status.");
	}
}

/** Delivery never touches the device socket, and never removes an unacknowledged event. */
export class OutboxDelivery {
	private retries = new Map<string, { attempts: number; after: number }>();
	private busy = false;
	private stopped = false;
	lastSuccessAt: number | null = null;
	lastError: string | null = null;
	constructor(
		private outbox: DurableOutbox,
		private client: Pick<BackendClient, "sendPunch">,
		private onReceipt: (receipt: PunchReceipt) => void = () => {},
	) {}
	async flush(now = Date.now()) {
		if (this.busy || this.stopped) return;
		this.busy = true;
		try {
			// Live punches take priority over old history replay after a long outage.
			const ready = this.outbox.pending
				.filter(({ key }) => (this.retries.get(key)?.after ?? 0) <= now)
				.sort((a, b) => b.punch.recordTime.localeCompare(a.punch.recordTime))
				.slice(0, 50);
			for (const { key, punch } of ready) {
				if (this.stopped) break;
				try {
					const receipt = await this.client.sendPunch(punch);
					await this.outbox.acknowledge(key);
					this.retries.delete(key);
					this.lastSuccessAt = Date.now();
					if (this.retries.size === 0) this.lastError = null;
					this.onReceipt(receipt);
				} catch (error) {
					const attempts = (this.retries.get(key)?.attempts ?? 0) + 1;
					this.retries.set(key, {
						attempts,
						after:
							Date.now() + Math.min(60_000, 1000 * 2 ** Math.min(attempts, 6)),
					});
					this.lastError =
						error instanceof Error ? error.message : "Delivery failed.";
					// Stop a batch when the backend is unavailable; a bad individual record does not starve the queue.
					if (
						!(error instanceof BackendHttpError) ||
						[401, 403, 404, 429].includes(error.status) ||
						error.status >= 500
					)
						break;
				}
			}
		} finally {
			this.busy = false;
		}
	}
	stop() {
		this.stopped = true;
	}
}
