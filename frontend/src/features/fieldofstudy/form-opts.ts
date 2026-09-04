import { formOptions } from "@tanstack/react-form";
import type { FieldOfStudyInput } from "./types";

export const fieldOfStudyFormOpts = formOptions({
	defaultValues: {
		title: "",
		branch: "theoretical",
	} as FieldOfStudyInput,
});
