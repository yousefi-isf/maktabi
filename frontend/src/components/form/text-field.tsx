import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { useFieldContext } from './form-context';

type TextFieldProps = Omit<
    React.ComponentProps<typeof Input>,
    'id' | 'name' | 'value' | 'onChange' | 'onBlur' | 'aria-invalid'
> & {
    label?: React.ReactNode
    description?: React.ReactNode
    orientation?: React.ComponentProps<typeof Field>["orientation"]
}

function TextField({
    label,
    description,
    orientation,
    ...props
}: TextFieldProps) {
    const field = useFieldContext<string>()
    const isHorizontal = orientation === "horizontal"

    const control = (
        <>
            <Input
                {...props}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => {
                    field.handleChange(e.target.value)
                    if (field.state.meta.errorMap.onServer) {
                        field.setMeta((prev) => ({
                            ...prev,
                            errorMap: { ...prev.errorMap, onServer: undefined },
                        }))
                    }
                }

                }
                onBlur={field.handleBlur}
                aria-invalid={
                    field.state.meta.errors.length > 0
                }
            />
            {description && (
                <FieldDescription>
                    {description}
                </FieldDescription>
            )}
            <FieldError errors={field.state.meta.errors} className="text-xs" />
        </>
    )

    return (
        <Field
            data-invalid={field.state.meta.errors.length > 0}
            orientation={orientation}
            className={isHorizontal ? "contents" : undefined}
        >
            {label && (
                <FieldLabel htmlFor={field.name}>
                    {label}
                </FieldLabel>
            )}
            {isHorizontal ? (
                <div className="col-start-2 flex flex-col gap-1.5">
                    {control}
                </div>
            ) : (
                control
            )}
        </Field>
    )
}

export default TextField