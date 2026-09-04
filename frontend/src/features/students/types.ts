import type { RouterInputs, RouterOutputs } from "@/lib/types";

export type Student = RouterOutputs["students"]["list"]["data"][number];
export type StudentInput = RouterInputs["students"]["create"];
export type StudentUpdateInput = RouterInputs["students"]["update"];
