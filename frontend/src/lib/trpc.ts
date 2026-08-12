import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../../../backend/src/trpc/router.js";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();