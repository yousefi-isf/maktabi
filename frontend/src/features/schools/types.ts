import type { RouterInputs, RouterOutputs } from "@/lib/types";

export type School = RouterOutputs["schools"]["list"]["data"][number];
export type SchoolInput = RouterInputs["schools"]["create"];
