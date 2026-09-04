import type { RouterInputs, RouterOutputs } from "@/lib/types";

export type FieldOfStudy =
	RouterOutputs["fieldsOfStudy"]["list"]["data"][number];
export type FieldOfStudyInput = RouterInputs["fieldsOfStudy"]["create"];
export type FieldOfStudyUpdateInput = RouterInputs["fieldsOfStudy"]["update"];
