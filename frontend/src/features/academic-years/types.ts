import type { RouterInputs, RouterOutputs } from "@/lib/types";

export type AcademicYear = RouterOutputs["academicYears"]["list"]["data"][number];
export type AcademicYearInput = RouterInputs["academicYears"]["create"];
export type AcademicYearUpdateInput = RouterInputs["academicYears"]["update"];
export type AcademicYearDetail = RouterOutputs["academicYears"]["getById"];

