import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import PasswordField from "./password-field";
import SelectField from "./select-field";
import SubmitField from "./submit-field";
import TextField from "./text-field";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();

export const {
	useAppForm,
	extendForm,
	useTypedAppFormContext,
	withFieldGroup,
	withForm,
} = createFormHook({
	fieldComponents: {
		TextField,
		SelectField,
		PasswordField,
	},
	formComponents: {
		SubmitField,
	},
	fieldContext,
	formContext,
});
