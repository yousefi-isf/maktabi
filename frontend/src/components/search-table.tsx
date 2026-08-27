import { withFieldGroup } from "./form/form-context";
import { Input } from "./ui/input";

export type Search = { q: string }

export const SearchField = withFieldGroup({
    defaultValues: { q: '' } as Search,
    props: {
        placeholderMeta: '',
    } as { placeholderMeta?: string },
    render: function Render({ group, placeholderMeta }) {

        return (

            <group.AppField name="q">
                {(field) => <Input
                    placeholder={`جستجو ${placeholderMeta} ...`}
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
                    } />}
            </group.AppField>
        )
    },
})