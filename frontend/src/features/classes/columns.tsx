import { createColumnHelper } from "@tanstack/react-table";
import { getSelectColumn } from "@/components/data-table/select-column";
import type { DataTableFeatures } from "@/components/ui/table-features";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/lib/permissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useState } from "react";
import { ClassFormDialog } from "./class-form-dialog";
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

type SchoolClass = RouterOutputs["classes"]["list"]["data"][number];

const columnHelper = createColumnHelper<DataTableFeatures, SchoolClass>();

export const columns = columnHelper.columns([
	getSelectColumn<SchoolClass>(),
	columnHelper.accessor("name", {
		header: "نام کلاس",
	}),
	columnHelper.accessor("gradeLevel.title", {
		header: "پایه تحصیلی",
	}),
	columnHelper.accessor("fieldOfStudy.title", {
		header: "رشته تحصیلی",
		cell: ({ getValue }) => getValue() || "عمومی",
	}),
	columnHelper.accessor("academicYear.title", {
		header: "سال تحصیلی",
	}),
	columnHelper.accessor("capacity", {
		header: "ظرفیت",
	}),
	columnHelper.accessor("_count.enrollments", {
		header: "تعداد دانش‌آموزان",
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
				trpc.classes.delete.mutationOptions({
					onSuccess: async () => {
						await queryClient.invalidateQueries({
							queryKey: trpc.classes.list.queryKey(),
						});
						showInfoToast("کلاس با موفقیت حذف شد.");
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

					<ClassFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} defaultValues={record} />

					<AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>حذف کلاس</AlertDialogTitle>
								<AlertDialogDescription>
									آیا از حذف کلاس "{record.name}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.
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

