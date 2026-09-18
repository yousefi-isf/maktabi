import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useAppForm } from "@/components/form/form-context";
import ItemDialog from "@/components/item-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { applyServerErrors } from "@/lib/apply-server-error";
import { parseDate } from "@/lib/persian-date";
import { showErrorToast, showSuccessToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import { getTRPCFieldErrors } from "@/lib/trpc-error";
import { AcademicYearFields } from "./academic-year-fields";
import { academicYearFormOpts } from "./form-opts";

interface CreateAcademicYearDialogProps {
	trigger?: React.ReactElement;
}

export function CreateAcademicYearDialog({ trigger }: CreateAcademicYearDialogProps) {
	const [open, setOpen] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const createAcademicYear = useMutation(
		trpc.academicYears.create.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
				showTRPCErrorToast(error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.academicYears.list.queryKey(),
				});
				showSuccessToast("سال تحصیلی با موفقیت ساخته شد");
				form.reset();
				setOpen(false);
			},
		})
	);

	const form = useAppForm({
		...academicYearFormOpts,
		async onSubmit({ value }) {
			const startDate = parseDate(value.startDate, "yyyy/MM/dd");
			const endDate = parseDate(value.endDate, "yyyy/MM/dd");

			if (!value.title.trim()) {
				showErrorToast("عنوان سال تحصیلی الزامی است");
				return;
			}

			if (!startDate) {
				showErrorToast("تاریخ شروع نامعتبر است (فرمت: ۱۴۰۳/۰۷/۰۱)");
				return;
			}

			if (!endDate) {
				showErrorToast("تاریخ پایان نامعتبر است (فرمت: ۱۴۰۴/۰۳/۳۱)");
				return;
			}

			if (endDate <= startDate) {
				showErrorToast("تاریخ پایان باید بعد از تاریخ شروع باشد");
				return;
			}

			await createAcademicYear.mutateAsync({
				title: value.title.trim(),
				startDate,
				endDate,
				isActive: Boolean(value.isActive),
			});
		},
	});

	return (
		<ItemDialog
			open={open}
			onOpenChange={setOpen}
			trigger={trigger ?? <Button><PlusIcon className="w-4 h-4 ml-1" />جدید</Button>}
			title={<>سال تحصیلی <span className="text-sm text-muted-foreground">(جدید)</span></>}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppForm>
					<AcademicYearFields
						form={form}
						fields={{
							title: "title",
							startDate: "startDate",
							endDate: "endDate",
							isActive: "isActive",
						}}
					/>
					<DialogFooter className="mt-4">
						<form.SubmitField submittingLabel="در حال ایجاد...">
							ایجاد
						</form.SubmitField>
					</DialogFooter>
				</form.AppForm>
			</form>
		</ItemDialog>
	);
}

