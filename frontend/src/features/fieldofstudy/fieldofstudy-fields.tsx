import { withFieldGroup } from "@/components/form/form-context";
import { FieldGroup } from "@/components/ui/field";
import type { FieldOfStudyInput } from "./types";

const defaultFieldOfStudyValues: FieldOfStudyInput = {
	title: "",
	branch: "theoretical",
};

export const branchOptions = [
	{ value: "theoretical", label: "نظری" },
	{ value: "technical", label: "فنی و حرفه‌ای" },
	{ value: "vocational", label: "کاردانش" },
];

export const branchLabels: Record<string, string> = {
	theoretical: "نظری",
	technical: "فنی و حرفه‌ای",
	vocational: "کاردانش",
};

export const FieldOfStudyFields = withFieldGroup({
	defaultValues: defaultFieldOfStudyValues,
	render: function Render({ group }) {
		return (
			<FieldGroup className="grid grid-cols-[auto_1fr] py-2">
				<group.AppField name="title">
					{(f) => <f.TextField label={"عنوان رشته"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="branch">
					{(f) => (
						<f.SelectField
							label={"شاخه تحصیلی"}
							orientation={"horizontal"}
							options={branchOptions}
						/>
					)}
				</group.AppField>
			</FieldGroup>
		);
	},
});

