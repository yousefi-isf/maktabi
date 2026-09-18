import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useAppForm } from '@/components/form/form-context';
import { GradeLevelFields } from '@/features/grade-levels';
import { applyServerErrors } from '@/lib/apply-server-error';
import { guardPermission } from '@/lib/route-guards';
import { showSuccessToast } from '@/lib/show-error-toast';
import { useTRPC } from '@/lib/trpc';
import { getTRPCFieldErrors } from '@/lib/trpc-error';

export const Route = createFileRoute(
	'/_authenticated/grade-levels/$gradeLevelId',
)({
	beforeLoad: guardPermission('academic.grade.list'),
	loader: async ({ params, context }) => {
		try {
			const gradeDetail =
				await context.trpcClient.gradeLevels.getById.query({
					id: params.gradeLevelId,
				});
			return { gradeDetail };
		} catch {
			throw redirect({ to: '..' });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { gradeDetail } = Route.useLoaderData();

	const updateGradeLevel = useMutation(
		trpc.gradeLevels.update.mutationOptions({
			onError: (error) => {
				getTRPCFieldErrors(error);
				applyServerErrors(form, error);
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.gradeLevels.list.queryKey(),
				});
				showSuccessToast('پایه تحصیلی با موفقیت بروزرسانی شد');
			},
		}),
	);

	const form = useAppForm({
		defaultValues: {
			title: gradeDetail.title,
			orderIndex: gradeDetail.orderIndex,
			stage: gradeDetail.stage,
		},
		onSubmit: async ({ value }) => {
			await updateGradeLevel.mutateAsync({
				id: gradeDetail.id,
				title: value.title,
				orderIndex: value.orderIndex,
				stage: value.stage,
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
				<form.AppForm>
					<GradeLevelFields
						form={form}
						fields={{
							title: 'title',
							orderIndex: 'orderIndex',
							stage: 'stage',
						}}
					/>
					<div className="mt-4">
						<form.SubmitField submittingLabel="در حال بروزرسانی...">
							بروزرسانی
						</form.SubmitField>
					</div>
				</form.AppForm>
			</form>
		</div>
	);
}
