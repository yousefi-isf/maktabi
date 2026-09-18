import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useStore } from "@tanstack/react-form";
import { useTRPC } from "@/lib/trpc";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FieldGroup } from "@/components/ui/field";
import { zodValidator } from "@tanstack/zod-form-adapter";

const SubjectTypeEnum = z.enum(["theoretical", "modular"]);

const moduleSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1, "عنوان پودمان الزامی است"),
	code: z.string().optional().nullable(),
	orderIndex: z.number().int().min(1),
	weight: z.number().min(0),
});

const formSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "نام درس الزامی است"),
	code: z.string().min(1, "کد درس الزامی است"),
	subjectType: SubjectTypeEnum,
	defaultUnit: z.number().min(0, "تعداد واحد باید مثبت باشد"),
	modules: z.array(moduleSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubjectFormDialogProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultValues?: Partial<FormValues> & { subjectModules?: any[] };
}

export function SubjectFormDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultValues }: SubjectFormDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;
	const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen;

	const isEdit = !!defaultValues?.id;
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const mutation = useMutation(
		(isEdit ? trpc.subjects.update : trpc.subjects.create).mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.subjects.list.queryKey(),
				});
				showInfoToast(isEdit ? "درس با موفقیت بروزرسانی شد." : "درس جدید با موفقیت ایجاد شد.");
				onOpenChange(false);
				if (!isEdit) form.reset();
			},
			onError: showTRPCErrorToast,
		})
	);

	const form = useAppForm({
		defaultValues: {
			name: defaultValues?.name || "",
			code: defaultValues?.code || "",
			subjectType: defaultValues?.subjectType || "theoretical",
			defaultUnit: defaultValues?.defaultUnit,
			modules: defaultValues?.subjectModules || [],
			...defaultValues,
		} as FormValues,
		validatorAdapter: zodValidator(),
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			mutation.mutate(value as any);
		},
	});

	const subjectType = useStore(form.store, (state) => state.values.subjectType);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{!controlledOpen && (
				<DialogTrigger>
					<Button className="gap-2">
						<Plus className="w-4 h-4" />
						ایجاد درس
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "ویرایش درس" : "ایجاد درس جدید"}</DialogTitle>
				</DialogHeader>

				<form.AppForm>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-6"
					>
						<FieldGroup>
							<form.AppField name="code">
								{(field: any) => (
									<field.TextField label="کد درس" placeholder="مثال: 12345" className="font-mono text-left" />
								)}
							</form.AppField>

							<form.AppField name="name">
								{(field: any) => (
									<field.TextField label="نام درس" placeholder="مثال: ریاضیات گسسته" />
								)}
							</form.AppField>

							<form.AppField name="subjectType">
								{(field: any) => (
									<field.SelectField
										label="نوع درس"
										placeholder="انتخاب نوع درس"
										options={[
											{ label: "نظری", value: "theoretical" },
											{ label: "پودمانی", value: "modular" },
										]}
									/>
								)}
							</form.AppField>

							<form.AppField name="defaultUnit">
								{(field: any) => (
									<field.NumberField label="تعداد واحد (ضریب)" step={1} />
								)}
							</form.AppField>
						</FieldGroup>

						{subjectType === 'modular' && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b pb-2">
									<h4 className="font-medium">پودمان‌ها</h4>
								</div>
								
								<form.AppField name="modules">
									{(field: any) => {
										const modules = field.state.value || [];
										return (
											<div className="space-y-4">
												{modules.map((_: any, i: number) => (
													<div key={i} className="flex gap-2 items-end bg-muted/30 p-2 rounded-md">
														<form.AppField name={`modules[${i}].orderIndex`}>
															{(subField: any) => <subField.NumberField label="شماره" className="w-16" />}
														</form.AppField>
														<form.AppField name={`modules[${i}].title`}>
															{(subField: any) => <subField.TextField label="عنوان" className="w-32" />}
														</form.AppField>
														<form.AppField name={`modules[${i}].code`}>
															{(subField: any) => <subField.TextField label="کد (اختیاری)" className="w-24 font-mono text-left" />}
														</form.AppField>
														<form.AppField name={`modules[${i}].weight`}>
															{(subField: any) => <subField.NumberField label="ضریب" className="w-16" />}
														</form.AppField>
														<Button 
															type="button" 
															variant="ghost" 
															size="icon" 
															className="mb-1 shrink-0 text-destructive"
															onClick={() => field.removeValue(i)}
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</div>
												))}
												<Button
													type="button"
													variant="outline"
													className="w-full border-dashed"
													onClick={() => field.pushValue({ title: "", orderIndex: modules.length + 1, weight: 1, code: "" })}
												>
													<Plus className="w-4 h-4 ml-2" /> افزودن پودمان
												</Button>
											</div>
										)
									}}
								</form.AppField>
							</div>
						)}

						<div className="flex justify-end gap-2 pt-4">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								انصراف
							</Button>
							<form.SubmitField submittingLabel="در حال ثبت...">
								{isEdit ? "ذخیره تغییرات" : "ایجاد درس"}
							</form.SubmitField>
						</div>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
