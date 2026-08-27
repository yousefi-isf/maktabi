import { columns } from '@/components/schools/columns';
import { DataTable } from '@/components/ui/data-table';
import { useTRPC } from '@/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards';
import { useAppForm } from '@/components/form/form-context';
import { SearchField } from '@/components/search-table';
import { useSelector } from '@tanstack/react-form';
import { useDebounce } from '@uidotdev/usehooks';

export const Route = createFileRoute('/_authenticated/schools')({
  beforeLoad: guardPermission('identity.school.list'),
  component: RouteComponent,
})

function RouteComponent() {
  const trpc = useTRPC()


  const form = useAppForm({
    defaultValues: {
      q: ''
    },

  })
  const _q = useSelector(form.store, (state) => state.values.q)
  const q = useDebounce(_q, 300);
  const schools = useQuery(trpc.schools.list.queryOptions({ limit: 20, page: 1, q }))
  return (
    <div className="flex flex-col gap-2">
      <form.AppForm>
        <SearchField form={form} fields={{ q: "q" }} placeholderMeta='مدارس' />
        <DataTable columns={columns} data={schools.data?.data ?? []} isLoading={schools.isLoading} />
      </form.AppForm>
    </div>
  )
}
