import { useQueryClient } from "@tanstack/react-query";
import { withFieldGroup } from "@/components/form/form-context";
import { FieldGroup } from "@/components/ui/field";
import { useTRPC } from "@/lib/trpc";
import type { UserInput } from "./types";

const defaultUserValues: Partial<UserInput> = {
	fullName: "",
	email: "",
	nationalCode: "",
	phone: "",
	academicYearId: "",
	roleId: "",
};

export const UserFields = withFieldGroup({
	defaultValues: defaultUserValues,
	render: function Render({ group }) {
		const trpc = useTRPC();
		const queryClient = useQueryClient();

		const academicYearsQuery = trpc.academicYears.list.queryOptions();
		const rolesQuery = trpc.roles.list.queryOptions();

		return (
			<FieldGroup className="grid grid-cols-[auto_1fr] py-2">
				<group.AppField name="fullName">
					{(f) => <f.TextField label={"نام و نام خانوادگی"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="email">
					{(f) => <f.TextField label={"ایمیل"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="nationalCode">
					{(f) => <f.TextField label={"کد ملی"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="phone">
					{(f) => <f.TextField label={"شماره تماس"} orientation={"horizontal"} />}
				</group.AppField>
				<group.AppField name="academicYearId">
					{(f) => (
						<f.AsyncField
							label={"سال تحصیلی"}
							orientation={"horizontal"}
							fetcher={async () => {
								const data = await queryClient.fetchQuery(academicYearsQuery);
								return data.map((year) => ({
									label: year.title,
									value: year.id,
								}));
							}}
							getDisplayValue={(op) => <>{op.label}</>}
							getOptionValue={(op) => op.value}
							renderOption={(op) => <>{op.label}</>}
						/>
					)}
				</group.AppField>
				{/* <group.AppField name="roleId">
					{(f) => (
						<f.AsyncField
							label={"نقش"}
							orientation={"horizontal"}
							fetcher={async () => {
								const data = await queryClient.fetchQuery(rolesQuery);
								return data.map((role) => ({
									label: role.name,
									description: role.description,
									value: role.id,
								}));
							}}
							getDisplayValue={(op) => <>{op.label}</>}
							getOptionValue={(op) => op.value}
							renderOption={(op) => (
								<>{op.label} {op.description ? ` - ${op.description}` : ""}</>
							)}
						/>
					)}
				</group.AppField> */}
			</FieldGroup>
		);
	},
});

export const AllUserFields = UserFields;
  