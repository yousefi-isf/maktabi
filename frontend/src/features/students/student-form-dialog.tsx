import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useAppForm } from "@/components/form/form-context";
import ItemDialog from "@/components/item-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { applyServerErrors } from "@/lib/apply-server-error";
import { showSuccessToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import { getTRPCFieldErrors } from "@/lib/trpc-error";
import { studentFormOpts } from "./form-opts";
import { StudentFields } from "./student-fields";
import type { StudentInput } from "./types";

interface CreateStudentDialogProps {
	trigger?: React.ReactElement;
}

export function CreateStudentDialog({ trigger }: CreateStudentDialogProps) {
	const [open, setOpen] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const createStudent = useMutation(
		trpc.students.create.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.students.list.queryKey(),
				});
				showSuccessToast("دانش‌آموز با موفقیت ثبت شد");
				form.reset();
				setOpen(false);
			},
		})
	);

	const form = useAppForm({
		...studentFormOpts,
		async onSubmit({ value }) {
			await createStudent.mutateAsync(value as StudentInput);
		},
	});

	return (
		<ItemDialog
			open={open}
			onOpenChange={setOpen}
			trigger={trigger ?? <Button><PlusIcon className="w-4 h-4 ml-1" />جدید</Button>}
			title={<>دانش‌آموز <span className="text-sm text-muted-foreground">(جدید)</span></>}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppForm>
					<StudentFields
						form={form}
						fields={{
							fullName: "fullName",
							nationalCode: "nationalCode",
							studentNumber: "studentNumber",
							email: "email",
							phone: "phone",
							status: "status",
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
