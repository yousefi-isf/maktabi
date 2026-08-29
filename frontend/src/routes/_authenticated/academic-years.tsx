import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/academic-years')({
  beforeLoad: guardPermission({
    anyOf: ['academic.year.create', 'academic.year.delete'],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/academic-years"!</div>
}
