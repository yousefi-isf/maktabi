import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PenIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import type { FieldOfStudy } from "./types";

interface FieldOfStudyRowActionsProps {
	fieldOfStudy: FieldOfStudy;
}

export function FieldOfStudyRowActions({ fieldOfStudy }: FieldOfStudyRowActionsProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const deleteFieldOfStudy = useMutation(trpc.fieldsOfStudy.delete.mutationOptions());

	async function handleClickRemove() {
		await deleteFieldOfStudy.mutateAsync(
			{ id: fieldOfStudy.id },
			{
				onError: (error) => {
					showTRPCErrorToast(error);
				},
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.fieldsOfStudy.list.queryKey(),
					});
					showInfoToast("رشته تحصیلی با موفقیت حذف شد");
				},
			}
		);
	}

	return (
		<ButtonGroup>
			<Button
				variant="outline"
				size="icon"
				render={
					<Link
						to="/fieldofstudy/$fieldofstudyId"
						params={{ fieldofstudyId: fieldOfStudy.id }}
					>
						<PenIcon />
					</Link>
				}
			/>
			<Button
				variant="destructive"
				size="icon"
				onClick={handleClickRemove}
				disabled={deleteFieldOfStudy.isPending}
			>
				<Trash2 />
			</Button>
		</ButtonGroup>
	);
}

