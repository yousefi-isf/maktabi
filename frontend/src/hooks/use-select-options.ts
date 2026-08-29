import { useMemo, useState } from "react";
import type { SelectOption } from "@/components/form/select-field";

// import type { SelectOption } from "./select-field";

type UseSelectOptionsParams<TData, TValue extends string = string> = {
	data: TData[] | undefined;
	getLabel?: (item: TData) => React.ReactNode;
	getValue?: (item: TData) => TValue;
	getDisabled?: (item: TData) => boolean;
	searchable?: boolean;
};

// حالت اول: داده رشته‌ای ساده — getLabel/getValue اختیاری
function useSelectOptions<TValue extends string = string>(params: {
	data: TValue[] | undefined;
	getLabel?: (item: TValue) => React.ReactNode;
	getValue?: (item: TValue) => TValue;
	getDisabled?: (item: TValue) => boolean;
	searchable?: boolean;
}): {
	options: SelectOption<TValue>[];
	allOptions: SelectOption<TValue>[];
	search: string;
	setSearch: (value: string) => void;
	isEmpty: boolean;
};

// حالت دوم: داده آبجکتی — getLabel/getValue الزامی
function useSelectOptions<TData, TValue extends string = string>(params: {
	data: TData[] | undefined;
	getLabel: (item: TData) => React.ReactNode;
	getValue: (item: TData) => TValue;
	getDisabled?: (item: TData) => boolean;
	searchable?: boolean;
}): {
	options: SelectOption<TValue>[];
	allOptions: SelectOption<TValue>[];
	search: string;
	setSearch: (value: string) => void;
	isEmpty: boolean;
};

// پیاده‌سازی واقعی
function useSelectOptions<TData, TValue extends string = string>({
	data,
	getLabel,
	getValue,
	getDisabled,
	searchable = false,
}: UseSelectOptionsParams<TData, TValue>) {
	const [search, setSearch] = useState("");

	const resolveLabel =
		getLabel ?? ((item: TData) => item as unknown as React.ReactNode);
	const resolveValue = getValue ?? ((item: TData) => item as unknown as TValue);

	const options = useMemo<SelectOption<TValue>[]>(() => {
		if (!data) return [];
		return data.map((item) => ({
			label: resolveLabel(item),
			value: resolveValue(item),
			disabled: getDisabled?.(item),
		}));
	}, [data, resolveLabel, resolveValue, getDisabled]);

	const filteredOptions = useMemo(() => {
		if (!searchable || !search.trim()) return options;
		const query = search.trim().toLowerCase();
		return options.filter((option) =>
			String(option.label).toLowerCase().includes(query),
		);
	}, [options, search, searchable]);

	return {
		options: searchable ? filteredOptions : options,
		allOptions: options,
		search,
		setSearch,
		isEmpty: options.length === 0,
	};
}

export default useSelectOptions;
