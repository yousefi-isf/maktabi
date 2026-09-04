import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useAppForm } from '@/components/form/form-context';
import { StudentFields } from '@/features/students';
import { applyServerErrors } from '@/lib/apply-server-error';
import { guardPermission } from '@/lib/route-guards';
import { showSuccessToast } from '@/lib/show-error-toast';
import { useTRPC } from '@/lib/trpc';
import { getTRPCFieldErrors } from '@/lib/trpc-error';

export const Route = createFileRoute('/_authenticated/students/$studentId')({
	beforeLoad: guardPermission('identity.student.list'),
	loader: async ({ params, context }) => {
		try {
			const studentDetail = await context.trpcClient.students.getById.query({
				id: params.studentId,
			});
			return { studentDetail };
		} catch {
			throw redirect({ to: '..' });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { studentDetail } = Route.useLoaderData();

	const updateStudent = useMutation(
		trpc.students.update.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.students.list.queryKey(),
				});
				showSuccessToast('اطلاعات دانش‌آموز با موفقیت به‌روزرسانی شد');
			},
		}),
	);

	const form = useAppForm({
		defaultValues: {
			fullName: studentDetail.fullName ?? '',
			nationalCode: studentDetail.nationalCode ?? '',
			studentNumber: studentDetail.studentNumber ?? '',
			email: studentDetail.email ?? '',
			phone: studentDetail.phone ?? '',
			status: (studentDetail.status as 'active' | 'inactive' | 'left') ?? 'active',
		},
		onSubmit: async ({ value }) => {
			await updateStudent.mutateAsync({
				studentId: studentDetail.id,
				fullName: value.fullName,
				nationalCode: value.nationalCode,
				studentNumber: value.studentNumber,
				email: value.email,
				phone: value.phone || undefined,
				status: value.status,
			});
		},
	});

	return (
		<div className="flex flex-col gap-4">
			<Link to=".." className="text-sm text-muted-foreground hover:underline">
				بازگشت
			</Link>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<StudentFields
					form={form}
					fields={{
						fullName: 'fullName',
						nationalCode: 'nationalCode',
						studentNumber: 'studentNumber',
						email: 'email',
						phone: 'phone',
						status: 'status',
					}}
				/>
				<form.AppForm>
					<form.SubmitField submittingLabel="در حال به‌روزرسانی...">
						به‌روزرسانی
					</form.SubmitField>
				</form.AppForm>
			</form>
		</div>
	);
}
