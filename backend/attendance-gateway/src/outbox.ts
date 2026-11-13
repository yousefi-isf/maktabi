import { createHash } from "node:crypto";
import { mkdir, open, readFile, truncate } from "node:fs/promises";
import { dirname } from "node:path";

export interface GatewayPunch {
	schoolId: string;
	deviceIp: string;
	deviceUserId: string;
	recordTime: string;
	/** Device user UID, not an event sequence. UDP may not provide it. */
	deviceSn: number | null;
}

export function normalizeDeviceUserId(value: string | number) {
	const id = String(value)
		.trim()
		.replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
		.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660));
	if (!/^\d{1,10}$/.test(id)) throw new Error("Invalid device user ID.");
	return id.length <= 9 ? id.padStart(9, "0") : id;
}

export function punchKey(punch: GatewayPunch) {
	return createHash("sha256")
		.update(
			JSON.stringify([
				punch.schoolId,
				punch.deviceIp,
				normalizeDeviceUserId(punch.deviceUserId),
				new Date(punch.recordTime).toISOString(),
			]),
		)
		.digest("hex");
}

/** Append-only, fsynced journal. No secret is written to disk. */
export class DurableOutbox {
	private seen = new Set<string>();
	private queue = new Map<string, GatewayPunch>();
	private tail: Promise<unknown> = Promise.resolve();
	private constructor(private path: string) {}

	static async load(path: string) {
		const outbox = new DurableOutbox(path);
		await mkdir(dirname(path), { recursive: true, mode: 0o700 });
		let data: Buffer;
		try {
			data = await readFile(path);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return outbox;
			throw error;
		}
		// A crash may leave the last write incomplete. Replay complete, synced lines only.
		const lastNewline = data.lastIndexOf(10);
		if (lastNewline !== data.length - 1) await truncate(path, lastNewline + 1);
		for (const line of data
			.subarray(0, lastNewline + 1)
			.toString("utf8")
			.split("\n")) {
			if (!line) continue;
			const event = JSON.parse(line);
			if (event.type === "enqueue" && Array.isArray(event.punches)) {
				for (const punch of event.punches as GatewayPunch[])
					outbox.remember(punch);
			} else if (event.type === "ack" && typeof event.key === "string")
				outbox.queue.delete(event.key);
			else
				throw new Error(
					"Invalid gateway outbox journal. Preserve the file for recovery.",
				);
		}
		return outbox;
	}

	private remember(punch: GatewayPunch) {
		const key = punchKey(punch);
		if (!this.seen.has(key)) {
			this.queue.set(key, punch);
			this.seen.add(key);
		}
	}
	private async append(event: unknown) {
		const file = await open(this.path, "a", 0o600);
		const originalSize = (await file.stat()).size;
		try {
			await file.writeFile(`${JSON.stringify(event)}\n`);
			await file.sync();
		} catch (error) {
			await file.truncate(originalSize);
			await file.sync();
			throw error;
		} finally {
			await file.close();
		}
	}
	private serial<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.tail.then(operation);
		this.tail = result.catch(() => {});
		return result;
	}
	enqueue(punches: GatewayPunch[]) {
		return this.serial(async () => {
			const unique = new Map(punches.map((punch) => [punchKey(punch), punch]));
			const added = [...unique]
				.filter(([key]) => !this.seen.has(key))
				.map(([, punch]) => punch);
			if (added.length) {
				await this.append({ type: "enqueue", punches: added });
				for (const punch of added) this.remember(punch);
			}
			return added.length;
		});
	}
	acknowledge(key: string) {
		return this.serial(async () => {
			if (!this.queue.has(key)) return;
			await this.append({ type: "ack", key });
			this.queue.delete(key);
		});
	}
	get pending() {
		return [...this.queue].map(([key, punch]) => ({ key, punch }));
	}
	get size() {
		return this.queue.size;
	}
	async close() {
		await this.tail;
	}
}
