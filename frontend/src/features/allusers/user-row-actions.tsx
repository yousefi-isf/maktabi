import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PenIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { showInfoToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import type { AllUsers } from "./types";

interface UserRowActionsProps {
	user: AllUsers;
}

export function UserRowActions({ user }: UserRowActionsProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const deleteUser = useMutation(trpc.users.deleteGlobal.mutationOptions());

	async function handleClickRemove() {
		await deleteUser.mutateAsync({ id: user.id }, {
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.users.listAll.queryKey(),
				});
				showInfoToast("1 کاربر با موفقیت حذف شد");
			},
		});
	}

	return (
		<ButtonGroup>
			<Button
				variant="outline"
				size="icon"
				render={
					<Link to="/allusers/$userId" params={{ userId: user.id }}>
						<PenIcon />
					</Link>
				}
			/>

			<Button
				variant="destructive"
				size="icon"
				onClick={handleClickRemove}
				disabled={deleteUser.isPending}
			>
				<Trash2 />
			</Button>
		</ButtonGroup>
	);
}

export const AllUserRowActions = UserRowActions;

