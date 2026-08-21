import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';
import { PasswordInput } from '../ui/password-input';
import { useFieldContext } from './form-context';

type PasswordFieldProps = Omit<
    React.ComponentProps<typeof PasswordInput>,
    'id' | 'name' | 'value' | 'onChange' | 'onBlur' | 'aria-invalid'
> & {
    label?: React.ReactNode
    description?: React.ReactNode
}

function PasswordField({
    label,
    description,
    ...props
}: PasswordFieldProps) {
    const field = useFieldContext<string>()
    return (
        <Field
            data-invalid={
                field.state.meta.errors.length > 0
            }
        >
            {label && (
                <FieldLabel htmlFor={field.name}>
                    {label}
                </FieldLabel>
            )}
            <PasswordInput
                {...props}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) =>
                    field.handleChange(
                        e.target.value
                    )
                }
                onBlur={field.handleBlur}
                aria-invalid={
                    field.state.meta.errors.length >
                    0
                }
            />
            {description && (
                <FieldDescription>
                    {description}
                </FieldDescription>
            )}
            <FieldError
                errors={field.state.meta.errors}
            />
        </Field>
    )
}

export default PasswordField
