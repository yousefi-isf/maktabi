import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";

/** Protect the journal from two gateway processes using the same data directory. */
export async function acquireGatewayLock(outboxPath: string) {
	const path = `${outboxPath}.lock`;
	await mkdir(dirname(path), { recursive: true, mode: 0o700 });
	const ownership = JSON.stringify({ pid: process.pid, nonce: randomUUID() });
	for (let attempt = 0; attempt < 3; attempt++) {
		let file;
		try {
			file = await open(path, "wx", 0o600);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
			let previous: string;
			try {
				previous = await readFile(path, "utf8");
			} catch (readError) {
				if ((readError as NodeJS.ErrnoException).code === "ENOENT") continue;
				throw readError;
			}
			let pid: number;
			try {
				pid = JSON.parse(previous).pid;
				if (!Number.isInteger(pid) || pid <= 0) throw new Error();
			} catch {
				throw new Error(
					"Gateway queue lock is incomplete. Another gateway may be starting; preserve the journal and retry.",
				);
			}
			try {
				process.kill(pid, 0);
			} catch (processError) {
				if ((processError as NodeJS.ErrnoException).code === "ESRCH") {
					if ((await readFile(path, "utf8")) === previous) await unlink(path);
					continue;
				}
				throw processError;
			}
			throw new Error(
				"Another gateway process is using this outbox. Use one process per device/data directory.",
			);
		}
		try {
			await file.writeFile(ownership);
			await file.sync();
		} finally {
			await file.close();
		}
		return async () => {
			try {
				if ((await readFile(path, "utf8")) === ownership) await unlink(path);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			}
		};
	}
	throw new Error("Could not acquire the gateway queue lock.");
}
