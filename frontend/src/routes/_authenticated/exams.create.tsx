import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/exams/create')({
  beforeLoad: guardPermission('academic.exam.create'),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/exams/create"!</div>
}
