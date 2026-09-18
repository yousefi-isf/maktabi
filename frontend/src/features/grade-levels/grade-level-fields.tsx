import { withFieldGroup } from "@/components/form/form-context";
import { FieldGroup } from "@/components/ui/field";
import type { GradeLevelInput } from "./types";

const defaultGradeLevelValues: GradeLevelInput = {
	title: "",
	orderIndex: 1,
	stage: "middle_school",
};

export const stageOptions = [
	{ value: "middle_school", label: "متوسطه اول" },
	{ value: "high_school", label: "متوسطه دوم" },
];

export const stageLabels: Record<string, string> = {
	middle_school: "متوسطه اول",
	high_school: "متوسطه دوم",
};

export const GradeLevelFields = withFieldGroup({
	defaultValues: defaultGradeLevelValues,
	render: function Render({ group }) {
		return (
			<FieldGroup className="grid grid-cols-[auto_1fr] py-2">
				<group.AppField name="title">
					{(f) => <f.TextField label={"عنوان پایه"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="orderIndex">
					{(f) => (
						<f.NumberField 
							label={"ترتیب عددی"} 
							orientation={"horizontal"} 
						/>
					)}
				</group.AppField>
				<group.AppField name="stage">
					{(f) => (
						<f.SelectField
							label={"مقطع تحصیلی"}
							orientation={"horizontal"}
							options={stageOptions}
						/>
					)}
				</group.AppField>
			</FieldGroup>
		);
	},
});
