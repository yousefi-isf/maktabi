# Digital School Backend

## Architecture

- `src/` contains the main Fastify and tRPC API.
- `src/modules/` contains domain modules.
- `src/trpc/` contains the root router, context, and auth/RBAC/tenant middleware.
- `src/plugins/` contains Fastify plugins such as Redis, session, and error handling.
- `attendance-gateway/` is the independent ZKTeco attendance service.
- `packages/` contains code shared by the API and attendance gateway.

## Boundaries

- Keep domain-specific code inside its module.
- Put database access and schema code in `packages/db`.
- Put queue names, payload schemas, and deterministic job IDs in `packages/queue`.
- Put domain enums, Zod schemas, and shared calculations in `packages/shared`.

## Package Manager & Tooling

- pnpm only, everywhere. Never `npm`/`npx`/`yarn`.
- `packageManager` is pinned exactly once, at the true monorepo root (`maktabi/package.json`). Never re-pin it inside a sub-package — a second pinned version causes drift.
- Shared dev tooling (`typescript`, `tsx`, `@biomejs/biome`, etc.) is installed at the workspace root with `-w`. pnpm automatically adds the root `node_modules/.bin` to PATH for every workspace package's scripts/exec, so there's no need to duplicate these per package — unless a specific package deliberately needs a different pinned version, in which case document why.

## Environment & Configuration

- All backend services share a single environment file: `backend/.env` (gitignored) and `backend/.env.example` (committed, no real secrets).
- Never rely on `process.cwd()` to locate `.env`. `pnpm --filter <pkg> <script>` changes the working directory to that package, not the monorepo root. Always resolve the path explicitly from the file's own location:
```ts
  const __dirname = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(__dirname, "<relative-path>/.env") });
```
  The relative depth depends on how deep the file lives under `backend/` (e.g. `packages/db/prisma.config.ts` → `../../.env`, `packages/db/src/client.ts` → `../../../.env`, `src/server.ts` → `../.env`).
- All packages use `"type": "module"`. Use `import.meta.url` + `node:url` / `node:path` (`fileURLToPath`, `dirname`, `resolve`) — never CommonJS `__dirname`/`__filename`.

## Database (`packages/db`)

- Prisma 7: the datasource URL lives in `prisma.config.ts`, not in `schema.prisma`. `PrismaClient` requires an explicit driver adapter (`@prisma/adapter-pg`) — there's no implicit connection anymore.
- `prisma generate` only needs `DATABASE_URL` to resolve as a string (no live DB required); `prisma migrate dev` needs a real, reachable Postgres.
- Soft-deleted tables (`deleted_at` column) need their unique constraints converted to **partial** unique indexes (`WHERE deleted_at IS NULL`). Prisma's schema language can't express this — it must be hand-edited into the generated migration SQL. Workflow: `prisma migrate dev --name <name> --create-only` → edit the SQL → `prisma migrate dev` again (no flag) to apply.
- Exception: if another table has a **composite** foreign key referencing a soft-deleted table's columns, that specific index must stay a **full** (non-partial) unique constraint — Postgres requires referenced columns to be backed by a full unique constraint or PK. (Example: `user_school(user_id, school_id)` stays non-partial because `student`/`teacher`/`parent`/`user_role` reference it.)
- `generated/` (the Prisma Client output) is a build artifact — always gitignored, never committed.

## Local Infrastructure (Docker)

- `backend/docker-compose.yml` runs Postgres + Redis for local dev.
- `postgres:18+` images require the volume mounted at `/var/lib/postgresql` (the parent dir), **not** `/var/lib/postgresql/data` — mounting the old path causes an infinite crash loop.
- pnpm ≥10.1 blocks dependency postinstall/build scripts by default. After adding a package that needs one (e.g. Prisma), run `pnpm approve-builds` and commit the resulting `allowBuilds` section in `pnpm-workspace.yaml`, so CI and teammates don't hit an interactive prompt.

## API Server (`src/`)

- Fastify + `@trpc/server/adapters/fastify`. Root router lives in `src/trpc/router.ts`; context (injects `prisma`, request/response) lives in `src/trpc/context.ts`.
- tRPC is mounted under `/trpc`; a plain `/health` route stays outside tRPC for simple uptime checks.
- Always disconnect Prisma on shutdown via Fastify's `onClose` hook (`prisma.$disconnect()`).
- New domain logic goes into `src/modules/<domain>/` and gets merged into the root router. `src/trpc/router.ts` stays a thin composition point — it shouldn't accumulate domain logic directly.

## tRPC Input Documentation

- Every endpoint that uses `.input(...)` must define a named input schema and place a request example immediately above it.
- Use this comment format:
```ts
/* -------------------------- Create input (JSON): -------------------------- */
/**
 * {
 *   "json": {
 *     "field": "value"
 *   },
 *   "meta": {
 *     "v": 1
 *   }
 * }
 */
const createInput = z.object({
  field: z.string(),
});
```
- Include `meta.values` for fields such as `Date` that need transformer metadata.
