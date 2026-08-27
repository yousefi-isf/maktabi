import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/users')({
  beforeLoad: guardPermission('identity.user.list'),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/users"!</div>
}
