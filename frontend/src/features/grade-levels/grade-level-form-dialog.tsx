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
import { gradeLevelFormOpts } from "./form-opts";
import { GradeLevelFields } from "./grade-level-fields";
import type { GradeLevelInput } from "./types";

interface CreateGradeLevelDialogProps {
	trigger?: React.ReactElement;
}

export function CreateGradeLevelDialog({ trigger }: CreateGradeLevelDialogProps) {
	const [open, setOpen] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const createGradeLevel = useMutation(
		trpc.gradeLevels.create.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.gradeLevels.list.queryKey(),
				});
				showSuccessToast("پایه تحصیلی با موفقیت ساخته شد");
				form.reset();
				setOpen(false);
			},
		})
	);

	const form = useAppForm({
		...gradeLevelFormOpts,
		async onSubmit({ value }) {
			await createGradeLevel.mutateAsync(value as GradeLevelInput);
		},
	});

	return (
		<ItemDialog
			open={open}
			onOpenChange={setOpen}
			trigger={trigger ?? <Button><PlusIcon className="w-4 h-4 ml-1" />جدید</Button>}
			title={<>پایه تحصیلی <span className="text-sm text-muted-foreground">(جدید)</span></>}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppForm>
					<GradeLevelFields
						form={form}
						fields={{
							title: "title",
							orderIndex: "orderIndex",
							stage: "stage",
						}}
					/>
					<DialogFooter className="mt-4">
						<form.SubmitField submittingLabel="در حال ثبت...">
							ثبت
						</form.SubmitField>
					</DialogFooter>
				</form.AppForm>
			</form>
		</ItemDialog>
	);
}
