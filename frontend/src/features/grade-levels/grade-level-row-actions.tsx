import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PenIcon, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import type { GradeLevel } from "./types";

interface GradeLevelRowActionsProps {
	gradeLevel: GradeLevel;
}

export function GradeLevelRowActions({ gradeLevel }: GradeLevelRowActionsProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const deleteGrade = useMutation(trpc.gradeLevels.delete.mutationOptions());

	async function handleClickRemove() {
		if (!confirm("آیا از حذف این پایه تحصیلی اطمینان دارید؟")) return;

		await deleteGrade.mutateAsync(
			{ id: gradeLevel.id },
			{
				onError: (error) => {
					showTRPCErrorToast(error);
				},
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.gradeLevels.list.queryKey(),
					});
					showInfoToast("پایه تحصیلی با موفقیت حذف شد");
				},
			}
		);
	}

	return (
		<ButtonGroup>
			<Button
				variant="outline"
				size="icon"
				title="ویرایش پایه تحصیلی"
				render={
					<Link
						to="/grade-levels/$gradeLevelId"
						params={{ gradeLevelId: gradeLevel.id }}
					>
						<PenIcon />
					</Link>
				}
			/>
			<Button
				variant="destructive"
				size="icon"
				onClick={handleClickRemove}
				disabled={deleteGrade.isPending}
				title="حذف پایه تحصیلی"
			>
				<Trash2 />
			</Button>
		</ButtonGroup>
	);
}
