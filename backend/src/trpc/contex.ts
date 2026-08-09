import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { prisma } from "@maktabi/db";

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return { prisma, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;