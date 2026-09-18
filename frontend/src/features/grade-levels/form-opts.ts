import { formOptions } from "@tanstack/react-form";
import type { GradeLevelInput } from "./types";

export const gradeLevelFormOpts = formOptions({
	defaultValues: {
		title: "",
		orderIndex: 1,
		stage: "middle_school",
	} as GradeLevelInput,
});
