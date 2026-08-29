import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/attendance')({
  beforeLoad: guardPermission({
    anyOf: ['attendance.record.read', 'attendance.record.read.own'],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/attendance"!</div>
}
