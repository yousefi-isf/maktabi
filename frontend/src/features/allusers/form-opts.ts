import { formOptions } from "@tanstack/react-form";
import type { UserInput } from "./types";

export const userFormOpts = formOptions({
	defaultValues: {
		fullName: "",
		email: "",
		nationalCode: "",
		phone: "",
		academicYearId: "",
		roleId: "",
	} as unknown as UserInput,
});

export const allUserFormOpts = userFormOpts;
