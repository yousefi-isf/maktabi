import { authRouter } from "../modules/auth/router.js";
import { usersRouter } from "../modules/users/router.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    time: new Date().toISOString(),
  })),
  auth: authRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
