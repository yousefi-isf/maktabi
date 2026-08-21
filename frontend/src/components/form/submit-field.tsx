import { Button } from '../ui/button';
import { useFormContext } from './form-context';

type SubmitFieldProps = Omit<
    React.ComponentProps<typeof Button>,
    'type' | 'disabled' | 'children'
> & {
    children: React.ReactNode
    submittingLabel?: React.ReactNode
}

function SubmitField({
    children,
    submittingLabel,
    ...props
}: SubmitFieldProps) {
    const form = useFormContext()
    return (
        <form.Subscribe
            // selector={(state) =>
            //     [state.canSubmit, state.isSubmitting] as const
            // }
            selector={(state) => { return { isSubmitting: state.isSubmitting, canSubmit: state.canSubmit } }}
        >
            {({ canSubmit, isSubmitting }) => (
                <Button
                    {...props}
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                >
                    {isSubmitting ? submittingLabel ?? children : children}
                </Button>
            )}
        </form.Subscribe>
    )
}

export default SubmitField
