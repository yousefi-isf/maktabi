import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/schools/details')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/schools/details"!</div>
}
