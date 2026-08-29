import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/permissions')({
  beforeLoad: guardPermission('identity.permission.list'),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/permissions"!</div>
}
