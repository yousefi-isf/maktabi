import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useAppForm } from "@/components/form/form-context";
import { useTRPC } from "@/lib/trpc";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useState } from "react";
import { Plus } from "lucide-react";
import { FieldGroup } from "@/components/ui/field";
import { zodValidator } from "@tanstack/zod-form-adapter";

const formSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "نام کلاس الزامی است"),
	capacity: z.number().min(1, "ظرفیت کلاس باید حداقل ۱ باشد"),
	academicYearId: z.string().min(1, "سال تحصیلی الزامی است"),
	gradeLevelId: z.string().min(1, "پایه تحصیلی الزامی است"),
	fieldOfStudyId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClassFormDialogProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultValues?: Partial<FormValues>;
}

export function ClassFormDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultValues }: ClassFormDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;
	const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

	const isEdit = !!defaultValues?.id;
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: filterOpts } = useQuery(trpc.rankings.getFilterOptions.queryOptions());

	const mutation = useMutation(
		(isEdit ? trpc.classes.update : trpc.classes.create).mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.classes.list.queryKey(),
				});
				showInfoToast(isEdit ? "کلاس با موفقیت بروزرسانی شد." : "کلاس جدید با موفقیت ایجاد شد.");
				onOpenChange(false);
				if (!isEdit) form.reset();
			},
			onError: showTRPCErrorToast,
		})
	);

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name || "",
			capacity: defaultValues?.capacity || 30,
			academicYearId: defaultValues?.academicYearId || "",
			gradeLevelId: defaultValues?.gradeLevelId || "",
			fieldOfStudyId: defaultValues?.fieldOfStudyId || "",
			...defaultValues,
		} as FormValues,
		validatorAdapter: zodValidator(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = {
				...value,
				fieldOfStudyId: value.fieldOfStudyId === "__none__" || !value.fieldOfStudyId ? undefined : value.fieldOfStudyId,
			};
			mutation.mutate(payload as any);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{!controlledOpen && (
				<DialogTrigger asChild>
					<Button className="gap-2">
						<Plus className="w-4 h-4" />
						ایجاد کلاس
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{isEdit ? "ویرایش کلاس" : "ایجاد کلاس جدید"}</DialogTitle>
				</DialogHeader>

				<form.AppForm>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<FieldGroup>
							<form.AppField name="name">
								{(field: any) => (
									<field.TextField label="نام کلاس" placeholder="مثال: کلاس 101" />
								)}
							</form.AppField>

							<form.AppField name="capacity">
								{(field: any) => (
									<field.NumberField label="ظرفیت کلاس" />
								)}
							</form.AppField>

							<form.AppField name="academicYearId">
								{(field: any) => (
									<field.SelectField
										label="سال تحصیلی"
										placeholder="انتخاب سال تحصیلی"
										options={
											filterOpts?.academicYears.map((ay) => ({
												label: ay.title,
												value: ay.id,
											})) || []
										}
									/>
								)}
							</form.AppField>

							<form.AppField name="gradeLevelId">
								{(field: any) => (
									<field.SelectField
										label="پایه تحصیلی"
										placeholder="انتخاب پایه تحصیلی"
										options={
											filterOpts?.gradeLevels.map((gl) => ({
												label: gl.title,
												value: gl.id,
											})) || []
										}
									/>
								)}
							</form.AppField>

							<form.AppField name="fieldOfStudyId">
								{(field: any) => (
									<field.SelectField
										label="رشته تحصیلی (اختیاری)"
										placeholder="عمومی / بدون رشته"
										options={[
											{ label: "عمومی / بدون رشته", value: "__none__" },
											...(filterOpts?.fieldsOfStudy.map((fs) => ({
												label: fs.title,
												value: fs.id,
											})) || []),
										]}
									/>
								)}
							</form.AppField>
						</FieldGroup>

						<div className="flex justify-end gap-2 pt-4">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								انصراف
							</Button>
							<form.SubmitField submittingLabel="در حال ثبت...">
								{isEdit ? "ذخیره تغییرات" : "ایجاد کلاس"}
							</form.SubmitField>
						</div>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
