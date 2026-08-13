import { prisma } from "@maktabi/db";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../modules/auth/auth.js";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const authSession = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return { prisma, req, res, authSession };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
