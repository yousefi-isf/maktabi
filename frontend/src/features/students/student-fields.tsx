import { withFieldGroup } from "@/components/form/form-context";
import { FieldGroup } from "@/components/ui/field";
import type { StudentInput } from "./types";

const defaultStudentValues: StudentInput = {
	fullName: "",
	nationalCode: "",
	studentNumber: "",
	email: "",
	phone: "",
	status: "active",
};

const statusOptions = [
	{ value: "active", label: "فعال" },
	{ value: "inactive", label: "غیرفعال" },
	{ value: "left", label: "انصرافی" },
];

export const StudentFields = withFieldGroup({
	defaultValues: defaultStudentValues,
	render: function Render({ group }) {
		return (
			<FieldGroup className="grid grid-cols-[auto_1fr] py-2">
				<group.AppField name="fullName">
					{(f) => <f.TextField label={"نام و نام خانوادگی"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="studentNumber">
					{(f) => <f.TextField label={"شماره دانش‌آموزی"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="nationalCode">
					{(f) => <f.TextField label={"کد ملی"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="email">
					{(f) => <f.TextField label={"ایمیل"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="phone">
					{(f) => <f.TextField label={"شماره تماس"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="status">
					{(f) => (
						<f.SelectField
							label={"وضعیت"}
							orientation={"horizontal"}
							options={statusOptions}
						/>
					)}
				</group.AppField>
			</FieldGroup>
		);
	},
});
