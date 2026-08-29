import { withFieldGroup } from "@/components/form/form-context";
import { FieldGroup } from "@/components/ui/field";
import useSelectOptions from "@/hooks/use-select-options";
import type { SchoolInput } from "./types";

const defaultSchoolValues: SchoolInput = {
    city: "",
    district: "",
    name: "",
    province: "",
    schoolType: "high_school",
    address: "",
    phone: "",
};

const SchoolTypeOptions = ["high_school", "middle_school", "technical"];

export const SchoolFields = withFieldGroup({
    defaultValues: defaultSchoolValues,
    render: function Render({ group }) {
        const { options } = useSelectOptions({
            data: SchoolTypeOptions,
            getLabel: (type) => {
                const labels: Record<string, string> = {
                    high_school: "متوسطه دوم",
                    middle_school: "متوسطه اول",
                    technical: "فنی و حرفه ای",
                };
                return labels[type] ?? type;
            },
            getValue: (type) => type,
        });

        return (
            <FieldGroup className="grid grid-cols-[auto_1fr] py-2">
                <group.AppField name="name">
                    {(f) => <f.TextField label={"نام"} orientation={"horizontal"} />}
                </group.AppField>
                <group.AppField name="address">
                    {(f) => <f.TextField label={"آدرس"} orientation={"horizontal"} />}
                </group.AppField>
                <group.AppField name="city">
                    {(f) => <f.TextField label={"شهر"} orientation={"horizontal"} />}
                </group.AppField>
                <group.AppField name="district">
                    {(f) => <f.TextField label={"منطقه"} orientation={"horizontal"} />}
                </group.AppField>
                <group.AppField name="phone">
                    {(f) => <f.TextField label={"تلفن"} orientation={"horizontal"} />}
                </group.AppField>
                <group.AppField name="province">
                    {(f) => <f.TextField label={"استان"} orientation={"horizontal"} />}
                </group.AppField>
                <group.AppField name="schoolType">
                    {(f) => <f.SelectField options={options} label={"نوع پایه مدرسه"} orientation={"horizontal"} />}
                </group.AppField>
            </FieldGroup>
        );
    },
});

