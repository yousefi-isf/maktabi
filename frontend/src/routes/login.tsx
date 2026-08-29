import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginForm } from '@/components/login-form';

const loginSearchSchema = z.object({
  notify: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context }) => {
    let isAuthenticated = false;
    try {
      await context.trpcClient.auth.me.query();
      isAuthenticated = true;
    } catch {
      // not authenticated — stay on /login
    }
    if (isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
})

function RouteComponent() {

  return <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div className="w-full max-w-sm">
      <LoginForm />
    </div>
  </div>
}
