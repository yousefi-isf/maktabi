import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/exams/publish')({
  beforeLoad: guardPermission('academic.exam.publish'),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/exams/publish"!</div>
}
