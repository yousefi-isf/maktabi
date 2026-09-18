import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useAppForm } from "@/components/form/form-context";
import { AcademicYearFields } from "@/features/academic-years";
import { applyServerErrors } from "@/lib/apply-server-error";
import { formatDate, parseDate } from "@/lib/persian-date";
import { guardPermission } from "@/lib/route-guards";
import { showErrorToast, showSuccessToast, showTRPCErrorToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import { getTRPCFieldErrors } from "@/lib/trpc-error";

export const Route = createFileRoute(
	"/_authenticated/academic-years/$academicYearId"
)({
	beforeLoad: guardPermission("academic.year.list"),
	loader: async ({ params, context }) => {
		try {
			const academicYearDetail =
				await context.trpcClient.academicYears.getById.query({
					id: params.academicYearId,
				});
			return { academicYearDetail };
		} catch {
			throw redirect({ to: ".." });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { academicYearDetail } = Route.useLoaderData();

	const updateAcademicYear = useMutation(
		trpc.academicYears.update.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
				showTRPCErrorToast(error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.academicYears.list.queryKey(),
				});
				showSuccessToast("سال تحصیلی با موفقیت به‌روزرسانی شد");
			},
		})
	);

	const form = useAppForm({
		defaultValues: {
			title: academicYearDetail.title,
			startDate: formatDate(new Date(academicYearDetail.startDate), "yyyy/MM/dd", {
				digits: "en",
			}),
			endDate: formatDate(new Date(academicYearDetail.endDate), "yyyy/MM/dd", {
				digits: "en",
			}),
			isActive: academicYearDetail.isActive,
		},
		onSubmit: async ({ value }) => {
			const startDate = parseDate(value.startDate, "yyyy/MM/dd");
			const endDate = parseDate(value.endDate, "yyyy/MM/dd");

			if (!value.title.trim()) {
				showErrorToast("عنوان سال تحصیلی الزامی است");
				return;
			}

			if (!startDate) {
				showErrorToast("تاریخ شروع نامعتبر است (فرمت: ۱۴۰۳/۰۷/۰۱)");
				return;
			}

			if (!endDate) {
				showErrorToast("تاریخ پایان نامعتبر است (فرمت: ۱۴۰۴/۰۳/۳۱)");
				return;
			}

			if (endDate <= startDate) {
				showErrorToast("تاریخ پایان باید بعد از تاریخ شروع باشد");
				return;
			}

			await updateAcademicYear.mutateAsync({
				id: academicYearDetail.id,
				title: value.title.trim(),
				startDate,
				endDate,
				isActive: Boolean(value.isActive),
			});
		},
	});

	return (
		<div className="flex flex-col gap-4 max-w-2xl">
			<Link to=".." className="text-sm text-muted-foreground hover:underline">
				← بازگشت به لیست سال‌های تحصیلی
			</Link>
			<div className="bg-card text-card-foreground border rounded-lg p-6 shadow-xs">
				<h2 className="text-lg font-semibold mb-4">
					ویرایش سال تحصیلی: {academicYearDetail.title}
				</h2>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<AcademicYearFields
							form={form}
							fields={{
								title: "title",
								startDate: "startDate",
								endDate: "endDate",
								isActive: "isActive",
							}}
						/>
						<div className="mt-6 flex justify-end">
							<form.SubmitField submittingLabel="در حال به‌روزرسانی...">
								به‌روزرسانی
							</form.SubmitField>
						</div>
					</form.AppForm>
				</form>
			</div>
		</div>
	);
}

