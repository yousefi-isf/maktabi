import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useAppForm } from '@/components/form/form-context';
import { SchoolFields } from '@/features/schools';
import { applyServerErrors } from '@/lib/apply-server-error';
import { showSuccessToast } from '@/lib/show-error-toast';
import { useTRPC } from '@/lib/trpc';
import { getTRPCFieldErrors } from '@/lib/trpc-error';

export const Route = createFileRoute('/_authenticated/schools/$schoolId')({
  component: RouteComponent,
  // beforeLoad: guardPermission('identity.school.list'),
  loader: async ({ params, context }) => {
    try {
      const schoolDetail = await context.trpcClient.schools.getById.query({ id: params.schoolId })
      return { schoolDetail }
    } catch (error) {
      throw redirect({ to: ".." });
      // showErrorToast(error)
      // navigate
    }
  },

})

function RouteComponent() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const updateSchool = useMutation(trpc.schools.update.mutationOptions({
    onError: (error) => {
      const fieldErrors = getTRPCFieldErrors(error);
      applyServerErrors(form, error);
      console.log(fieldErrors)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trpc.schools.list.queryKey(),
      })
      showSuccessToast("مدرسه با موفقیت به‌روزرسانی شد")
    }
  }))

  const { schoolDetail } = Route.useLoaderData()
  // const navigate = useNavigate();
  const form = useAppForm({
    defaultValues: {
      ...schoolDetail,
      address: schoolDetail.address ?? undefined,
      phone: schoolDetail.phone ?? undefined,
    },
    onSubmit: async ({ value }) => {
      await updateSchool.mutateAsync({ ...value, id: schoolDetail.id })
    }
  })

  return <div>
    <Link to="..">بازگشت</Link>
    <form onSubmit={(e) => {
      e.preventDefault()
      e.stopPropagation()
      form.handleSubmit(e)
    }}>

      <SchoolFields
        form={form}
        fields={{
          city: "city",
          district: "district",
          name: "name",
          province: "province",
          schoolType: "schoolType",
          address: "address",
          phone: "phone"
        }}
      />
      <form.AppForm>
        <form.SubmitField submittingLabel="در حال به‌روزرسانی...">
          به‌روزرسانی
        </form.SubmitField>
      </form.AppForm>
    </form>
  </div>
}
