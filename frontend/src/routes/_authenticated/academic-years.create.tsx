import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/academic-years/create')({
  beforeLoad: guardPermission('academic.year.create'),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/academic-years/create"!</div>
}
