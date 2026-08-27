import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
} from "@/components/ui/field"
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { cn } from "@/lib/utils"
import { useAppForm } from "./form/form-context";
import { ModeToggle } from "./mode-toggle"
import { showErrorToast } from "@/lib/show-error-toast";

const loginSchema = z.object({
    email: z.email("ایمیل معتبر وارد کنید"),
    password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter()

    const [error, setError] = useState<string | null>(null)

    const form = useAppForm({
        defaultValues: {
            email: "",
            password: "",
        } satisfies LoginValues,
        validators: {
            onSubmit: loginSchema,
        },
        onSubmit: async ({ value }) => {
            setError(null)
            const { error } = await authClient.signIn.email({
                email: value.email,
                password: value.password,
            })
            if (error) {
                setError(getAuthErrorMessage(error))
                showErrorToast(getAuthErrorMessage(error))
                return
            }
            router.invalidate()
            router.navigate({ to: "/" })
        },
    })

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex gap-2 items-center justify-between">
                        <h2>ورود به مکتبی | Maktabi</h2>
                        <ModeToggle />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form.AppForm >
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                form.handleSubmit()
                            }}
                        >
                            <FieldGroup>
                                <form.AppField name="email">
                                    {(field) => (
                                        <field.TextField
                                            type="email"
                                            label="ایمیل"
                                            placeholder="m@example.com"
                                            autoComplete="email"
                                        />
                                    )}
                                </form.AppField>
                                <form.AppField name="password">
                                    {(field) => (
                                        <field.PasswordField
                                            label="رمز عبور"
                                            autoComplete="current-password"
                                        />
                                    )}
                                </form.AppField>
                                <form.SubmitField submittingLabel="در حال ورود...">
                                    ورود
                                </form.SubmitField>
                                {error ? (
                                    <p className="text-sm text-destructive text-center">{error}</p>
                                ) : null}
                                <Field>
                                    <FieldDescription className="text-center">
                                        حساب کاربری ندارید ؟{" "}
                                        <a href="#2">ارتباط با مدیریت</a>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    </form.AppForm>
                </CardContent>
            </Card>
        </div>
    )
}
