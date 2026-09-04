import { formOptions } from "@tanstack/react-form";
import type { StudentInput } from "./types";

export const studentFormOpts = formOptions({
	defaultValues: {
		fullName: "",
		nationalCode: "",
		email: "",
		phone: "",
		studentNumber: "",
		status: "active",
	} as StudentInput,
});
