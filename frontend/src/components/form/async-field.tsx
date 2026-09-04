import type * as React from "react";
import {
	AsyncSelect,
	type BaseAsyncSelectProps,
	type MultiAsyncSelectProps,
	type SingleAsyncSelectProps,
} from "../ui/async-select";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { useFieldContext } from "./form-context";

type BaseAsyncFieldProps<TOption> = Omit<
	BaseAsyncSelectProps<TOption>,
	"label"
> & {
	label?: React.ReactNode;
	selectLabel?: string;
	description?: React.ReactNode;
	orientation?: React.ComponentProps<typeof Field>["orientation"];
};

export type SingleAsyncFieldProps<TOption> = BaseAsyncFieldProps<TOption> & {
	multiple?: false;
};

export type MultiAsyncFieldProps<TOption> = BaseAsyncFieldProps<TOption> & {
	multiple: true;
	maxDisplayedTags?: number;
};

export type AsyncFieldProps<TOption> =
	| SingleAsyncFieldProps<TOption>
	| MultiAsyncFieldProps<TOption>;

function AsyncField<TOption>({
	label,
	selectLabel,
	description,
	orientation,
	placeholder = "انتخاب کنید...",
	width = "100%",
	multiple = false,
	...props
}: AsyncFieldProps<TOption>) {
	const field = useFieldContext<any>();
	const isHorizontal = orientation === "horizontal";

	const searchLabel =
		selectLabel ?? (typeof label === "string" ? label : "گزینه");

	const handleValueChange = (val: string | string[]) => {
		field.handleChange(val);
		if (field.state.meta.errorMap.onServer) {
			field.setMeta((prev: any) => ({
				...prev,
				errorMap: { ...prev.errorMap, onServer: undefined },
			}));
		}
	};

	const selectComponent = multiple ? (
		<AsyncSelect<TOption>
			{...(props as Omit<MultiAsyncSelectProps<TOption>, "value" | "onChange" | "label">)}
			multiple={true}
			label={searchLabel}
			placeholder={placeholder}
			width={width}
			value={Array.isArray(field.state.value) ? field.state.value : []}
			onChange={handleValueChange as (val: string[]) => void}
		/>
	) : (
		<AsyncSelect<TOption>
			{...(props as Omit<SingleAsyncSelectProps<TOption>, "value" | "onChange" | "label">)}
			multiple={false}
			label={searchLabel}
			placeholder={placeholder}
			width={width}
			value={typeof field.state.value === "string" ? field.state.value : ""}
			onChange={handleValueChange as (val: string) => void}
		/>
	);

	const control = (
		<>
			{selectComponent}
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError errors={field.state.meta.errors} className="text-xs" />
		</>
	);

	return (
		<Field
			data-invalid={field.state.meta.errors.length > 0}
			orientation={orientation}
			className={isHorizontal ? "contents" : undefined}
		>
			{label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
			{isHorizontal ? (
				<div className="col-start-2 flex flex-col gap-1.5">{control}</div>
			) : (
				control
			)}
		</Field>
	);
}

export default AsyncField;