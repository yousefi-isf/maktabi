import type { RouterInputs, RouterOutputs } from "@/lib/types";

export type GradeLevel = RouterOutputs["gradeLevels"]["list"]["data"][number];
export type GradeLevelInput = RouterInputs["gradeLevels"]["create"];
export type GradeLevelUpdateInput = RouterInputs["gradeLevels"]["update"];
