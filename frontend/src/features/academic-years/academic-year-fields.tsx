import { withFieldGroup } from "@/components/form/form-context";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { formatDate, parseDate } from "@/lib/persian-date";
import { defaultAcademicYearValues } from "./form-opts";

export const AcademicYearFields = withFieldGroup({
	defaultValues: defaultAcademicYearValues,
	render: function Render({ group }) {
		return (
			<FieldGroup className="grid grid-cols-[auto_1fr] gap-4 py-2">
				<group.AppField name="title">
					{(f) => (
						<f.TextField
							label="عنوان سال تحصیلی"
							placeholder="مثال: ۱۴۰۳-۱۴۰۴"
							orientation="horizontal"
						/>
					)}
				</group.AppField>

				<group.AppField name="startDate">
					{(f) => {
						const parsed = f.state.value ? parseDate(f.state.value, "yyyy/MM/dd") : null;
						return (
							<f.TextField
								label="تاریخ شروع"
								placeholder="۱۴۰۳/۰۷/۰۱"
								dir="ltr"
								orientation="horizontal"
								description={
									parsed
										? formatDate(parsed, "EEEE d MMMM yyyy")
										: "فرمت: YYYY/MM/DD (مثال: ۱۴۰۳/۰۷/۰۱)"
								}
							/>
						);
					}}
				</group.AppField>

				<group.AppField name="endDate">
					{(f) => {
						const parsed = f.state.value ? parseDate(f.state.value, "yyyy/MM/dd") : null;
						return (
							<f.TextField
								label="تاریخ پایان"
								placeholder="۱۴۰۴/۰۳/۳۱"
								dir="ltr"
								orientation="horizontal"
								description={
									parsed
										? formatDate(parsed, "EEEE d MMMM yyyy")
										: "فرمت: YYYY/MM/DD (مثال: ۱۴۰۴/۰۳/۳۱)"
								}
							/>
						);
					}}
				</group.AppField>

				<group.AppField name="isActive">
					{(subField) => (
						<div className="col-span-2 flex items-start gap-3 pt-2">
							<Checkbox
								id={subField.name}
								checked={Boolean(subField.state.value)}
								onCheckedChange={(checked) => subField.handleChange(Boolean(checked))}
							/>
							<div className="grid gap-1.5 leading-none">
								<label
									htmlFor={subField.name}
									className="text-sm font-medium cursor-pointer"
								>
									سال تحصیلی فعال (جاری)
								</label>
								<p className="text-xs text-muted-foreground">
									با فعال‌سازی این گزینه، این سال به عنوان سال تحصیلی جاری مدرسه تنظیم می‌شود.
								</p>
							</div>
						</div>
					)}
				</group.AppField>
			</FieldGroup>
		);
	},
});

