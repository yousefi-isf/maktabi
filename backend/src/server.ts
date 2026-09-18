import { pathToFileURL } from "node:url";
import { EventEmitter } from "node:events";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { prisma } from "@maktabi/db";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { env } from "#env";
import { auth } from "./modules/auth/auth.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
import { processPunch } from "./modules/attendance/punch.service.js";

/**
 * Internal event bus — emits 'punch' and 'deviceStatus' events.
 */
export const punchEvents = new EventEmitter();

/**
 * In-memory state of attendance devices (schoolId -> 'connected' | 'disconnected')
 */
export const deviceStatuses = new Map<string, 'connected' | 'disconnected'>();



export async function buildServer() {
  const app = Fastify({
    logger: true,
    bodyLimit: 50 * 1024 * 1024, // 50MB limit to support large PDF base64 payloads
  });

  await app.register(cors, {
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86_400,
  });
  await app.register(helmet);

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${env.HOST}:${env.PORT}`);
        const headers = fromNodeHeaders(request.headers);
        headers.delete("content-length");
        const body =
          request.body === undefined
            ? undefined
            : typeof request.body === "string"
              ? request.body
              : JSON.stringify(request.body);
        const authRequest = new Request(url, {
          method: request.method,
          headers,
          ...(body === undefined ? {} : { body }),
        });
        const response = await auth.handler(authRequest);

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
        });

        const setCookies = response.headers.getSetCookie();
        if (setCookies.length > 0) reply.header("set-cookie", setCookies);

        const responseBody = Buffer.from(await response.arrayBuffer());
        return reply.send(responseBody.length > 0 ? responseBody : null);
      } catch (error) {
        request.log.error({ err: error }, "Authentication request failed");
        return reply.status(500).send({
          error: "Internal authentication error",
          code: "AUTH_FAILURE",
        });
      }
    },
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  // -----------------------------------------------------------------------
  // Internal route — called only by the attendance-gateway service.
  // NOT exposed publicly; protect with the shared GATEWAY_SECRET.
  // -----------------------------------------------------------------------
  app.post("/internal/device/punch", {
    schema: {
      body: {
        type: "object",
        required: ["secret", "schoolId", "deviceUserId", "recordTime", "deviceIp", "deviceSn"],
        properties: {
          secret: { type: "string" },
          schoolId: { type: "string" },
          deviceUserId: { type: "string" },
          recordTime: { type: "string" },
          deviceIp: { type: "string" },
          deviceSn: { type: "number" },
        },
      },
    },
    async handler(request, reply) {
      const body = request.body as {
        secret: string;
        schoolId: string;
        deviceUserId: string;
        recordTime: string;
        deviceIp: string;
        deviceSn: number;
      };

      // 1. Validate shared secret
      if (body.secret !== env.GATEWAY_SECRET) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      try {
        const result = await processPunch(body);

        // 2. Broadcast to any active real-time listeners (SSE / tRPC subscription)
        if (!result.alreadyExists) {
          punchEvents.emit("punch", result);
        }

        return reply.status(result.alreadyExists ? 200 : 201).send(result);
      } catch (err) {
        request.log.error({ err }, "[punch] Failed to process punch event");
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  });

  // -----------------------------------------------------------------------
  // Internal route for Gateway to report device connection status
  // -----------------------------------------------------------------------
  app.post("/internal/device/status", {
    schema: {
      body: {
        type: "object",
        required: ["secret", "schoolId", "status"],
        properties: {
          secret: { type: "string" },
          schoolId: { type: "string" },
          status: { type: "string", enum: ["connected", "disconnected"] },
        },
      },
    },
    async handler(request, reply) {
      const body = request.body as { secret: string; schoolId: string; status: 'connected' | 'disconnected' };
      if (body.secret !== env.GATEWAY_SECRET) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      deviceStatuses.set(body.schoolId, body.status);
      punchEvents.emit("deviceStatus", { schoolId: body.schoolId, status: body.status });

      return reply.send({ success: true });
    },
  });

  app.get("/health", async () => ({ status: "ok" }));


  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

export async function validateDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function startServer(app: FastifyInstance) {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);
}

async function main() {
  const app = await buildServer();

  try {
    await validateDatabaseConnection();
  } catch (error) {
    app.log.error(
      "Database connection failed. Check that PostgreSQL is running and DATABASE_URL is correct.",
    );
    app.log.debug({ err: error }, "Database connection details");
    await app.close();
    process.exitCode = 1;
    return;
  }

  try {
    await startServer(app);
  } catch (error) {
    app.log.error("API server failed to start.");
    app.log.debug({ err: error }, "API server startup details");
    await app.close();
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
