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
