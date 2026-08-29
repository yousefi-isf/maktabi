import { formOptions } from "@tanstack/react-form";
import type { SchoolInput } from "./types";

export const schoolFormOpts = formOptions({
	defaultValues: {
		city: "",
		district: "",
		name: "",
		province: "",
		schoolType: "high_school",
		address: "",
		phone: "",
	} as SchoolInput,
});
