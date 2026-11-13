# Attendance Gateway

Requires Node.js 22.16 or newer. The gateway polls one device, writes every new
event to a durable local journal, and retries backend delivery until the exact
event is acknowledged. Device punches remain stage one; teachers confirm daily
classroom attendance separately.

## Configuration and running

Copy `.env.example` to `.env` in this directory and set the school's UUID.
Configuration precedence is: process environment, gateway `.env`, backend
`.env`. Paths are relative to this package, independent of the working directory.
`GATEWAY_SECRET` can therefore be inherited from `backend/.env`; do not leave a
blank override in the gateway configuration. Backend and gateway secrets must
match. Set `BACKEND_URL` explicitly if the backend is on another machine/port.

From the repository root:

```sh
pnpm --dir backend/attendance-gateway check:config
pnpm --dir backend/attendance-gateway dev
```

Use `start` instead of `dev` for a process without a file watcher. The config
check never prints secrets or API tokens. The former hardcoded school fallback
was removed; incomplete configuration stops startup with the missing variable
name.

The device clock is interpreted in `DEVICE_TIME_ZONE` (default `Asia/Tehran`)
before conversion to UTC. Its physical clock still needs to be correct. Existing
historical records previously interpreted in the wrong host timezone are not
silently rewritten.

## Recovery and event identity

`userSn` is a device user UID, not an increasing attendance sequence. Identity
is school + device IP + normalized user ID + exact device timestamp. Repeated
scans at different times are independent events. The timestamp resolution
available from this library is one second; identical user/device/time records
are treated as a replay.

On startup, reconnect, count changes and periodic full rescans, device history
is enqueued through the same deduplication path. There is no baseline that
discards earlier logs. Latest timestamps are delivered first so live events do
not wait behind a large historical backlog. The service does not clear device
attendance memory.

The fsynced `data/outbox.jsonl` journal retains unacknowledged events across
backend failures and restarts, and repairs an incomplete final write after a
crash. Preserve this directory. Use a separate `GATEWAY_DATA_DIR` per device and
school. A process lock prevents multiple gateways sharing an active journal.
Changing schools/devices with an incompatible pending queue stops startup.

The backend must have migration `20261112110000_device_punch_event_identity`
applied before running this version:

```sh
pnpm --dir backend/packages/db exec prisma migrate deploy
pnpm --dir backend/packages/db build
```

The migration preserves existing log IDs and classroom confirmation references.
It removes the incorrect device-IP/userSn uniqueness constraint and permits
missing userSn on UDP devices.

## Monitoring

The HTTP listener defaults to `127.0.0.1:3002`.

- `/health` returns basic connection/queue health; it returns 503 when degraded.
- `/device/users` and `/device/logs/recent` require
  `Authorization: Bearer <GATEWAY_API_TOKEN>`. Without a configured token those
  diagnostic routes are disabled. They read caches and never issue concurrent
  SDK commands. Passwords and card numbers are not returned.
- A non-loopback `GATEWAY_HOST` requires a diagnostic API token.
- Heartbeats run independently of device reads and punch delivery. Backend
  connection status expires after 45 seconds without a report.

Student names in sync results come from the backend's school-scoped match,
including 9-digit national-code prefixes and zero-padded IDs. Device user names
and device roles are only diagnostic metadata. Unknown punches are preserved
and can be linked on replay after student registration.

## Verification

```sh
pnpm --dir backend/attendance-gateway build
pnpm --dir backend/attendance-gateway test
node --conditions=development --import tsx backend/src/modules/attendance/punch.service.test.ts
node --import tsx backend/src/modules/attendance/events.test.ts
```

Stop the main gateway before running `test:device`, which makes its own device
connection. It only reads users/logs and does not display device passwords.
