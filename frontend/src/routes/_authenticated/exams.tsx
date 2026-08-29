import { createFileRoute } from '@tanstack/react-router'
import { guardPermission } from '@/lib/route-guards'

export const Route = createFileRoute('/_authenticated/exams')({
  beforeLoad: guardPermission({
    anyOf: ['academic.exam.read', 'academic.exam.read.own', 'academic.exam.create'],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/exams"!</div>
}
