import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Loader2, PenIcon, Trash2, UserRoundKey } from "lucide-react";
import { useState } from "react";
import ItemDialog from "@/components/item-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { showInfoToast, showSuccessToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import type { Student } from "./types";

interface StudentRowActionsProps {
	student: Student;
}

export function StudentRowActions({ student }: StudentRowActionsProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
	const [inviteUrl, setInviteUrl] = useState("");
	const [copied, setCopied] = useState(false);

	const deleteStudent = useMutation(trpc.students.delete.mutationOptions());

	const inviteMutation = useMutation(
		trpc.users.invite.mutationOptions({
			onSuccess: (data) => {
				setInviteUrl(data.inviteUrl);
				setInviteDialogOpen(true);
				showSuccessToast("لینک دعوتنامه با موفقیت ایجاد شد");
			},
			onError: (error) => {
				showTRPCErrorToast(error);
			},
		})
	);

	async function handleClickRemove() {
		await deleteStudent.mutateAsync(
			{ studentIds: [student.id] },
			{
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.students.list.queryKey(),
					});
					showInfoToast("1 دانش‌آموز با موفقیت حذف شد");
				},
			},
		);
	}

	async function handleInviteClick() {
		await inviteMutation.mutateAsync({ userId: student.userId });
	}

	async function handleCopyLink() {
		if (!inviteUrl) return;
		await navigator.clipboard.writeText(inviteUrl);
		setCopied(true);
		showSuccessToast("لینک دعوت با موفقیت کپی شد");
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<>
			<ButtonGroup>
				<Button
					variant="ghost"
					size="icon"
					render={
						<Link to="/students/$studentId" params={{ studentId: student.id }}>
							<PenIcon />
						</Link>
					}
				/>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleInviteClick}
					disabled={inviteMutation.isPending}
					title="ایجاد لینک دعوت"
				>
					{inviteMutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<UserRoundKey />
					)}
				</Button>
				<Button
					variant="destructive"
					size="icon"
					onClick={handleClickRemove}
					disabled={deleteStudent.isPending}
					title="حذف دانش‌آموز"
				>
					<Trash2 />
				</Button>
			</ButtonGroup>

			<ItemDialog
				open={inviteDialogOpen}
				onOpenChange={setInviteDialogOpen}
				title={<>لینک دعوت کاربر <span className="text-sm text-muted-foreground">({student.fullName})</span></>}
			>
				<div className="flex flex-col gap-3 py-2">
					<p className="text-sm text-muted-foreground">
						لینک زیر جهت تعیین رمز عبور و ورود اولیه دانش‌آموز ایجاد شده است و به مدت ۴۸ ساعت معتبر می‌باشد:
					</p>
					<div className="flex items-center gap-2">
						<Input
							readOnly
							value={inviteUrl}
							className="font-mono text-xs text-left select-all"
							dir="ltr"
						/>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={handleCopyLink}
							title="کپی لینک"
						>
							{copied ? (
								<Check className="h-4 w-4 text-green-600" />
							) : (
								<Copy className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			</ItemDialog>
		</>
	);
}
