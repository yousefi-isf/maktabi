import { authRouter } from "../modules/auth/router.js";
import { academicYearsRouter } from "../modules/academic-years/router.js";
import { rolesRouter } from "../modules/roles/router.js";
import { usersRouter } from "../modules/users/router.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    time: new Date().toISOString(),
  })),
  auth: authRouter,
  academicYears: academicYearsRouter,
  users: usersRouter,
  roles: rolesRouter,
});

export type AppRouter = typeof appRouter;
