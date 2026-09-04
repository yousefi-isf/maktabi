import type { RouterInputs, RouterOutputs } from "@/lib/types";

export type AllUser = RouterOutputs["users"]["listAll"]["data"][number];
export type AllUsers = AllUser;
export type UserInput = RouterInputs["users"]["create"];
export type AllUserInput = UserInput;
