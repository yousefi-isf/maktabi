import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select'
import { useFieldContext } from './form-context'

export type SelectOption<T extends string = string> = {
    label: React.ReactNode
    value: T
    disabled?: boolean
}

type SelectFieldProps<T extends string = string> = {
    label?: React.ReactNode
    description?: React.ReactNode
    orientation?: React.ComponentProps<typeof Field>['orientation']
    placeholder?: string
    options: SelectOption<T>[]
    disabled?: boolean
    className?: string
}

function SelectField<T extends string = string>({
    label,
    description,
    orientation,
    placeholder = 'انتخاب کنید...',
    options,
    disabled,
    className,
}: SelectFieldProps<T>) {
    const field = useFieldContext<T>()
    const isHorizontal = orientation === 'horizontal'
    const selectedLabel = options.find(
        (o) => o.value === field.state.value
    )?.label
    const control = (
        <>
            <Select
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => {
                    field.handleChange(value as T)
                    if (field.state.meta.errorMap.onServer) {
                        field.setMeta((prev) => ({
                            ...prev,
                            errorMap: { ...prev.errorMap, onServer: undefined },
                        }))
                    }
                }

                }
                disabled={disabled}
            >
                <SelectTrigger
                    id={field.name}
                    className={className}
                    aria-invalid={
                        field.state.meta.errors.length > 0
                    }
                    onBlur={field.handleBlur}
                >
                    <SelectValue placeholder={placeholder} >{selectedLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {description && (
                <FieldDescription>
                    {description}
                </FieldDescription>
            )}
            <FieldError errors={field.state.meta.errors} />
        </>
    )

    return (
        <Field
            data-invalid={field.state.meta.errors.length > 0}
            orientation={orientation}
            className={isHorizontal ? 'contents' : undefined}
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

export default SelectField