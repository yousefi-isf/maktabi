import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// import type { RouterOutputs } from "@/lib/permissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useState } from "react";
import { SubjectFormDialog } from "./subject-form-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { RouterOutputs } from "@/lib/types";

type Subject = RouterOutputs["subjects"]["list"]["data"][number];

const columnHelper = createColumnHelper<DataTableFeatures, Subject>();

const subjectTypeTranslations: Record<string, string> = {
	theoretical: "نظری",
	modular: "پودمانی",
};

export const columns = columnHelper.columns([
	getSelectColumn<Subject>(),
	columnHelper.accessor("code", {
		header: "کد درس",
		cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
	}),
	columnHelper.accessor("name", {
		header: "نام درس",
	}),
	columnHelper.accessor("subjectType", {
		header: "نوع درس",
		cell: ({ getValue }) => {
			const val = getValue();
			return subjectTypeTranslations[val] || val;
		},
	}),
	columnHelper.accessor("defaultUnit", {
		header: "تعداد واحد (ضریب)",
		cell: ({ getValue }) => <span className="font-mono">{Number(getValue())}</span>,
	}),
	columnHelper.display({
		id: "actions",
		cell: function RowActions({ row }) {
			const record = row.original;
			const trpc = useTRPC();
			const queryClient = useQueryClient();
			const [isEditOpen, setIsEditOpen] = useState(false);
			const [isDeleteOpen, setIsDeleteOpen] = useState(false);

			const deleteMutation = useMutation(
				trpc.subjects.delete.mutationOptions({
					onSuccess: async () => {
						await queryClient.invalidateQueries({
							queryKey: trpc.subjects.list.queryKey(),
						});
						showInfoToast("درس با موفقیت حذف شد.");
						setIsDeleteOpen(false);
					},
					onError: showTRPCErrorToast,
				})
			);

			return (
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)}>
						<Edit className="w-4 h-4 text-muted-foreground" />
					</Button>
					<Button variant="ghost" size="icon" onClick={() => setIsDeleteOpen(true)}>
						<Trash2 className="w-4 h-4 text-destructive" />
					</Button>

					<SubjectFormDialog 
						open={isEditOpen} 
						onOpenChange={setIsEditOpen} 
						defaultValues={{ ...record, defaultUnit: Number(record.defaultUnit) }} 
					/>

					<AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>حذف درس</AlertDialogTitle>
								<AlertDialogDescription>
									آیا از حذف درس "{record.name}" اطمینان دارید؟
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>انصراف</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									onClick={() => deleteMutation.mutate({ id: record.id })}
								>
									حذف
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			);
		},
	}),
]);

