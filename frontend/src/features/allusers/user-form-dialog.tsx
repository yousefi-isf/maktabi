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
import { userFormOpts } from "./form-opts";
import type { UserInput } from "./types";
import { UserFields } from "./user-fields";

interface CreateUserDialogProps {
	trigger?: React.ReactElement;
}

export function CreateUserDialog({ trigger }: CreateUserDialogProps) {
	const [open, setOpen] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const createUser = useMutation(
		trpc.users.create.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.users.listAll.queryKey(),
				});
				showSuccessToast("کاربر با موفقیت ساخته شد");
				form.reset();
				setOpen(false);
			},
		})
	);

	const form = useAppForm({
		...userFormOpts,
		async onSubmit({ value }) {
			await createUser.mutateAsync(value as UserInput);
		},
	});

	return (
		<ItemDialog
			open={open}
			onOpenChange={setOpen}
			trigger={trigger ?? <Button><PlusIcon className="w-4 h-4 ml-1" />جدید</Button>}
			title={<>کاربر <span className="text-sm text-muted-foreground">(جدید)</span></>}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppForm>
					<UserFields
						form={form}
						fields={{
							fullName: "fullName",
							email: "email",
							nationalCode: "nationalCode",
							phone: "phone",
							academicYearId: "academicYearId",
							// roleId: "roleId",
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

export const CreateAllUserDialog = CreateUserDialog;
