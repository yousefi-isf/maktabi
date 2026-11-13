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
	defaultValues?: Omit<Partial<FormValues>, "fieldOfStudyId"> & { fieldOfStudyId?: string | null };
}

export function ClassFormDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultValues }: ClassFormDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;
	const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

	const isEdit = !!defaultValues?.id;
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: filterOpts } = useQuery(trpc.rankings.getFilterOptions.queryOptions());

	const mutationOptions = {
		onSuccess: async () => {
			await queryClient.invalidateQueries(trpc.classes.list.pathFilter());
			showInfoToast(isEdit ? "کلاس با موفقیت بروزرسانی شد." : "کلاس جدید با موفقیت ایجاد شد.");
			onOpenChange(false);
			if (!isEdit) form.reset();
		},
		onError: showTRPCErrorToast,
	};
	const createMutation = useMutation(trpc.classes.create.mutationOptions(mutationOptions));
	const updateMutation = useMutation(trpc.classes.update.mutationOptions(mutationOptions));

	const initialValues: FormValues = {
		id: defaultValues?.id,
		name: defaultValues?.name ?? "",
		capacity: defaultValues?.capacity ?? 30,
		academicYearId: defaultValues?.academicYearId || "",
		gradeLevelId: defaultValues?.gradeLevelId || "",
		fieldOfStudyId: defaultValues?.fieldOfStudyId || "",
	};
	const form = useAppForm({
		defaultValues: initialValues,
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = {
				...value,
				fieldOfStudyId: value.fieldOfStudyId === "__none__" || !value.fieldOfStudyId ? undefined : value.fieldOfStudyId,
			};
			if (value.id) {
				await updateMutation.mutateAsync({ ...payload, id: value.id });
			} else {
				await createMutation.mutateAsync(payload);
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{!controlledOpen && (
				<DialogTrigger render={<Button className="gap-2" />}>
					<Plus className="w-4 h-4" />
					ایجاد کلاس
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
								{(field) => (
									<field.TextField label="نام کلاس" placeholder="مثال: کلاس 101" />
								)}
							</form.AppField>

							<form.AppField name="capacity">
								{(field) => (
									<field.NumberField label="ظرفیت کلاس" />
								)}
							</form.AppField>

							<form.AppField name="academicYearId">
								{(field) => (
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
								{(field) => (
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
								{(field) => (
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
