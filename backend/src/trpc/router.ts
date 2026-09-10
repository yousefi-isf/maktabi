import { academicYearsRouter } from "../modules/academic-years/router.js";
import { fieldsOfStudyRouter } from "../modules/fields-of-study/router.js";
import { authRouter } from "../modules/auth/router.js";
import { permissionsRouter } from "../modules/permissions/router.js";
import { rolesRouter } from "../modules/roles/router.js";
import { schoolsRouter } from "../modules/schools/router.js";
import { usersRouter } from "../modules/users/router.js";
import { studentsRouter } from "../modules/students/router.js";
import { reportCardImporterRouter } from "../modules/importers/report-card/router.js";
import { rankingsRouter } from "../modules/rankings/router.js";
import { createCallerFactory, publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    time: new Date().toISOString(),
  })),
  auth: authRouter,
  academicYears: academicYearsRouter,
  fieldsOfStudy: fieldsOfStudyRouter,
  users: usersRouter,
  students: studentsRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
  schools: schoolsRouter,
  reportCards: reportCardImporterRouter,
  rankings: rankingsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
