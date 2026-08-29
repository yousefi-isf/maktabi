import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { useAppForm } from '@/components/form/form-context';
import { authClient } from '@/lib/auth-client';
import { showAuthErrorToast, showSuccessToast } from '@/lib/show-error-toast';


const setPasswordSchema = z.object({
  token: z.string().min(1).optional(),
})
export const Route = createFileRoute('/set-password')({
  component: RouteComponent,
  validateSearch: setPasswordSchema,
  beforeLoad: async ({ context, search }) => {
    if (!search.token) {
      throw redirect({ to: '/' })
    }
    try {
      const invitedUser = await context.trpcClient.auth.invitedUser.query({
        token: search.token,
      })
      return { token: search.token, invitedUser }
    } catch (error) {
      const appCode = (error as { data?: { appCode?: string } }).data?.appCode
      if (appCode === 'INVITE_NOT_FOUND') {
        throw redirect({
          to: '/login',
        })
      }
      throw error
    }
  }
})

const formSchema = z.object({
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
  confirmPassword: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'رمزهای عبور یکسان نیستند',
  path: ['confirmPassword'],
})

function RouteComponent() {
  const { token, invitedUser } = Route.useRouteContext()
  const navigate = useNavigate()

  const form = useAppForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value: { password } }) => {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (error) {
        showAuthErrorToast(error)
        return
      }
      showSuccessToast('رمز عبور با موفقیت تنظیم شد.')
      navigate({ to: '/login' })
    },
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              تنظیم رمز عبور برای <span>{invitedUser.fullName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form.AppForm>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  <form.AppField name="password">
                    {(field) => (
                      <field.PasswordField
                        label="رمز عبور"
                        autoComplete="new-password"
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="confirmPassword">
                    {(field) => (
                      <field.PasswordField
                        label="تکرار رمز عبور"
                        autoComplete="new-password"
                      />
                    )}
                  </form.AppField>
                  <form.SubmitField submittingLabel="در حال ذخیره...">
                    ذخیره رمز عبور
                  </form.SubmitField>
                </FieldGroup>
              </form>
            </form.AppForm>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
