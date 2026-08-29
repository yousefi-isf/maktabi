import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/roles')({
  beforeLoad: guardPermission('identity.role.list'),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/roles"!</div>
}
