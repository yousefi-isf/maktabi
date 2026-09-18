import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PenIcon, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { showInfoToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import type { AcademicYear } from "./types";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";

interface AcademicYearRowActionsProps {
	academicYear: AcademicYear;
}

export function AcademicYearRowActions({ academicYear }: AcademicYearRowActionsProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const deleteAcademicYear = useMutation(trpc.academicYears.delete.mutationOptions());
	const [deleteOpen, setDeleteOpen] = useState(false);

	const statsQuery = useQuery({
		...trpc.academicYears.getDeleteStats.queryOptions({ id: academicYear.id }),
		enabled: deleteOpen
	});

	async function handleConfirmDelete() {
		await deleteAcademicYear.mutateAsync(
			{ id: academicYear.id, force: true },
			{
				onError: (error) => {
					showTRPCErrorToast(error);
				},
				onSuccess: async () => {
					setDeleteOpen(false);
					await queryClient.invalidateQueries({
						queryKey: trpc.academicYears.list.queryKey(),
					});
					showInfoToast("سال تحصیلی و اطلاعات وابسته کاملاً حذف شد.");
				},
			}
		);
	}

	return (
		<>
			<ButtonGroup>
				<Button
					variant="outline"
					size="icon"
					title="ویرایش سال تحصیلی"
					render={
						<Link
							to="/academic-years/$academicYearId"
							params={{ academicYearId: academicYear.id }}
						>
							<PenIcon />
						</Link>
					}
				/>
				<Button
					variant="destructive"
					size="icon"
					onClick={() => setDeleteOpen(true)}
					disabled={deleteAcademicYear.isPending}
					title="حذف سال تحصیلی"
				>
					<Trash2 />
				</Button>
			</ButtonGroup>
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							اخطار حذف سال تحصیلی
						</DialogTitle>
						<DialogDescription>
							آیا از حذف سال تحصیلی «{academicYear.title}» اطمینان دارید؟
						</DialogDescription>
					</DialogHeader>
					
					<div className="py-4">
						{statsQuery.isPending && (
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Loader2 className="w-4 h-4 animate-spin" />
								در حال بررسی اطلاعات وابسته...
							</div>
						)}
						{statsQuery.isError && (
							<div className="text-destructive text-sm">
								خطا در دریافت اطلاعات وابسته
							</div>
						)}
						{statsQuery.isSuccess && (
							<div className="space-y-2 text-sm text-muted-foreground">
								<p className="font-semibold text-foreground mb-2">با تایید این عملیات، رکوردهای مرتبط زیر نیز کاملاً و برای همیشه پاک خواهند شد:</p>
								<ul className="list-disc list-inside space-y-1 pr-2">
									{statsQuery.data.schoolClasses > 0 && <li><strong className="text-foreground">{statsQuery.data.schoolClasses}</strong> کلاس درس</li>}
									{statsQuery.data.enrollments > 0 && <li><strong className="text-foreground">{statsQuery.data.enrollments}</strong> ثبت‌نام دانش‌آموز</li>}
									{statsQuery.data.teachingAssignments > 0 && <li><strong className="text-foreground">{statsQuery.data.teachingAssignments}</strong> تخصیص معلم به درس</li>}
									{statsQuery.data.curricula > 0 && <li><strong className="text-foreground">{statsQuery.data.curricula}</strong> عنوان درسی در برنامه‌ها</li>}
									{statsQuery.data.terms > 0 && <li><strong className="text-foreground">{statsQuery.data.terms}</strong> ترم تحصیلی (و امتحانات و نمرات مرتبط)</li>}
								</ul>
								{(statsQuery.data.schoolClasses === 0 && statsQuery.data.enrollments === 0 && statsQuery.data.terms === 0 && statsQuery.data.curricula === 0) && (
									<p className="text-emerald-600">این سال تحصیلی اطلاعات وابسته‌ای ندارد و با خیال راحت قابل حذف است.</p>
								)}
								<p className="mt-4 text-destructive font-medium border border-destructive/20 bg-destructive/10 p-3 rounded-md">
									توجه: این عملیات غیرقابل بازگشت است. در صورتی که دانش‌آموزان یا دروس این سال تحصیلی منحصراً در همین سال ثبت شده باشند، رکورد آن‌ها نیز از پایگاه داده حذف خواهد شد!
								</p>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteAcademicYear.isPending}>
							انصراف
						</Button>
						<Button 
							variant="destructive" 
							onClick={handleConfirmDelete} 
							disabled={statsQuery.isPending || statsQuery.isError || deleteAcademicYear.isPending}
							className="gap-2"
						>
							{deleteAcademicYear.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
							حذف سال تحصیلی و متعلقات
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
