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
import { fieldOfStudyFormOpts } from "./form-opts";
import { FieldOfStudyFields } from "./fieldofstudy-fields";
import type { FieldOfStudyInput } from "./types";

interface CreateFieldOfStudyDialogProps {
	trigger?: React.ReactElement;
}

export function CreateFieldOfStudyDialog({ trigger }: CreateFieldOfStudyDialogProps) {
	const [open, setOpen] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const createFieldOfStudy = useMutation(
		trpc.fieldsOfStudy.create.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.fieldsOfStudy.list.queryKey(),
				});
				showSuccessToast("رشته تحصیلی با موفقیت ساخته شد");
				form.reset();
				setOpen(false);
			},
		})
	);

	const form = useAppForm({
		...fieldOfStudyFormOpts,
		async onSubmit({ value }) {
			await createFieldOfStudy.mutateAsync(value as FieldOfStudyInput);
		},
	});

	return (
		<ItemDialog
			open={open}
			onOpenChange={setOpen}
			trigger={trigger ?? <Button><PlusIcon className="w-4 h-4 ml-1" />جدید</Button>}
			title={<>رشته تحصیلی <span className="text-sm text-muted-foreground">(جدید)</span></>}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppForm>
					<FieldOfStudyFields
						form={form}
						fields={{
							title: "title",
							branch: "branch",
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

