import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useAppForm } from '@/components/form/form-context';
import { UserFields } from '@/features/allusers';
import { guardPermission } from '@/lib/route-guards';
import { showSuccessToast } from '@/lib/show-error-toast';

export const Route = createFileRoute('/_authenticated/allusers/$userId')({
  beforeLoad: guardPermission('system.full_access'),
  loader: async ({ params, context }) => {
    try {
      const userDetail = await context.trpcClient.users.getById.query({ id: params.userId });
      return { userDetail };
    } catch {
      throw redirect({ to: '..' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userDetail } = Route.useLoaderData();

  const form = useAppForm({
    defaultValues: {
      fullName: userDetail.fullName,
      email: userDetail.email,
      nationalCode: userDetail.nationalCode,
      phone: userDetail.phone ?? '',
      academicYearId: userDetail.academicYearId ?? '',
      // roleId: userDetail.roleId ?? '',
    },
    onSubmit: async () => {
      showSuccessToast('اطلاعات کاربر با موفقیت به‌روزرسانی شد');
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
        <UserFields
          form={form}
          fields={{
            fullName: 'fullName',
            email: 'email',
            nationalCode: 'nationalCode',
            phone: 'phone',
            academicYearId: "academicYearId",
            // roleId: "roleId",
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
