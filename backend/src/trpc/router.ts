import { academicYearsRouter } from "../modules/academic-years/router.js";
import { authRouter } from "../modules/auth/router.js";
import { permissionsRouter } from "../modules/permissions/router.js";
import { rolesRouter } from "../modules/roles/router.js";
import { schoolsRouter } from "../modules/schools/router.js";
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
  permissions: permissionsRouter,
  schools: schoolsRouter,
});

export type AppRouter = typeof appRouter;
