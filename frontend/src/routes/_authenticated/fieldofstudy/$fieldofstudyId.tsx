import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useAppForm } from '@/components/form/form-context';
import { FieldOfStudyFields } from '@/features/fieldofstudy';
import { applyServerErrors } from '@/lib/apply-server-error';
import { guardPermission } from '@/lib/route-guards';
import { showSuccessToast } from '@/lib/show-error-toast';
import { useTRPC } from '@/lib/trpc';
import { getTRPCFieldErrors } from '@/lib/trpc-error';

export const Route = createFileRoute(
	'/_authenticated/fieldofstudy/$fieldofstudyId',
)({
	beforeLoad: guardPermission('academic.field.list'),
	loader: async ({ params, context }) => {
		try {
			const fieldDetail =
				await context.trpcClient.fieldsOfStudy.getById.query({
					id: params.fieldofstudyId,
				});
			return { fieldDetail };
		} catch {
			throw redirect({ to: '..' });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { fieldDetail } = Route.useLoaderData();

	const updateFieldOfStudy = useMutation(
		trpc.fieldsOfStudy.update.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.fieldsOfStudy.list.queryKey(),
				});
				showSuccessToast('رشته تحصیلی با موفقیت به‌روزرسانی شد');
			},
		}),
	);

	const form = useAppForm({
		defaultValues: {
			title: fieldDetail.title,
			branch: fieldDetail.branch,
		},
		onSubmit: async ({ value }) => {
			await updateFieldOfStudy.mutateAsync({
				id: fieldDetail.id,
				title: value.title,
				branch: value.branch,
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
				<FieldOfStudyFields
					form={form}
					fields={{
						title: 'title',
						branch: 'branch',
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
