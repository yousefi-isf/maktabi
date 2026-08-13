import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { prisma } from "@maktabi/db";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";
import Fastify from "fastify";
import { env } from "#env";
import { auth } from "./modules/auth/auth.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

export async function buildServer() {
  const app = Fastify({ logger: true });

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
        const url = new URL(request.url, env.BETTER_AUTH_URL);
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

  app.get("/health", async () => ({ status: "ok" }));

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

async function main() {
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API listening on ${env.BETTER_AUTH_URL}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
