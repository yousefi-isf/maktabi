import { useDebounce } from "@uidotdev/usehooks";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Option {
	value: string;
	label: string;
	disabled?: boolean;
	description?: string;
	icon?: React.ReactNode;
}

export interface BaseAsyncSelectProps<T> {
	/** Async function to fetch options */
	fetcher: (query?: string) => Promise<T[]>;
	/** Preload all data ahead of time */
	preload?: boolean;
	/** Function to filter options */
	filterFn?: (option: T, query: string) => boolean;
	/** Function to render each option */
	renderOption: (option: T) => React.ReactNode;
	/** Function to get the value from an option */
	getOptionValue: (option: T) => string;
	/** Function to get the display value for the selected option */
	getDisplayValue: (option: T) => React.ReactNode;
	/** Custom not found message */
	notFound?: React.ReactNode;
	/** Custom loading skeleton */
	loadingSkeleton?: React.ReactNode;
	/** Label for the select field */
	label: string;
	/** Placeholder text when no selection */
	placeholder?: string;
	/** Disable the entire select */
	disabled?: boolean;
	/** Custom width for the popover */
	width?: string | number;
	/** Custom class names */
	className?: string;
	/** Custom trigger button class names */
	triggerClassName?: string;
	/** Custom no results message */
	noResultsMessage?: string;
	/** Allow clearing the selection */
	clearable?: boolean;
}

export type SingleAsyncSelectProps<T> = BaseAsyncSelectProps<T> & {
	multiple?: false;
	value: string;
	onChange: (value: string) => void;
};

export type MultiAsyncSelectProps<T> = BaseAsyncSelectProps<T> & {
	multiple: true;
	value: string[];
	onChange: (value: string[]) => void;
	/** Maximum number of tags to display before collapsing with +X */
	maxDisplayedTags?: number;
};

export type AsyncSelectProps<T> = SingleAsyncSelectProps<T> | MultiAsyncSelectProps<T>;

export function AsyncSelect<T>(props: AsyncSelectProps<T>) {
	const {
		fetcher,
		preload,
		filterFn,
		renderOption,
		getOptionValue,
		getDisplayValue,
		notFound,
		loadingSkeleton,
		label,
		placeholder = "انتخاب کنید...",
		disabled = false,
		width = "100%",
		className,
		triggerClassName,
		noResultsMessage,
		clearable = true,
		multiple = false,
	} = props;

	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearchTerm = useDebounce(searchTerm, preload ? 0 : 300);

	// Stable refs for props/callbacks to avoid triggering infinite re-renders
	const fetcherRef = useRef(fetcher);
	fetcherRef.current = fetcher;

	const filterFnRef = useRef(filterFn);
	filterFnRef.current = filterFn;

	const getOptionValueRef = useRef(getOptionValue);
	getOptionValueRef.current = getOptionValue;

	const getDisplayValueRef = useRef(getDisplayValue);
	getDisplayValueRef.current = getDisplayValue;

	const originalOptionsRef = useRef<T[]>([]);
	const isFirstRender = useRef(true);

	// Cache all discovered options so selected options persist when search filters options
	const optionsCacheRef = useRef<Map<string, T>>(new Map());

	const updateOptionsCache = useCallback((newOptions: T[]) => {
		for (const opt of newOptions) {
			const key = getOptionValueRef.current(opt);
			optionsCacheRef.current.set(key, opt);
		}
	}, []);

	// Main fetch effect - only depends on debounced search term and preload flag
	useEffect(() => {
		let isCancelled = false;

		const runFetch = async () => {
			if (preload && !isFirstRender.current) {
				if (debouncedSearchTerm) {
					const filtered = originalOptionsRef.current.filter((option) =>
						filterFnRef.current ? filterFnRef.current(option, debouncedSearchTerm) : true,
					);
					setOptions(filtered);
				} else {
					setOptions(originalOptionsRef.current);
				}
				return;
			}

			try {
				setLoading(true);
				setError(null);
				const data = await fetcherRef.current(debouncedSearchTerm);
				if (!isCancelled) {
					updateOptionsCache(data);
					if (preload && isFirstRender.current) {
						originalOptionsRef.current = data;
					}
					setOptions(data);
				}
			} catch (err) {
				if (!isCancelled) {
					setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات");
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
					isFirstRender.current = false;
				}
			}
		};

		runFetch();

		return () => {
			isCancelled = true;
		};
	}, [debouncedSearchTerm, preload, updateOptionsCache]);

	const isSelected = useCallback(
		(optVal: string) => {
			if (multiple) {
				const values = (props as MultiAsyncSelectProps<T>).value ?? [];
				return values.includes(optVal);
			}
			return (props as SingleAsyncSelectProps<T>).value === optVal;
		},
		[multiple, props],
	);

	const handleSelect = useCallback(
		(currentValue: string) => {
			if (multiple) {
				const multiProps = props as MultiAsyncSelectProps<T>;
				const currentValues = multiProps.value ?? [];
				const exists = currentValues.includes(currentValue);
				const nextValues = exists
					? currentValues.filter((v) => v !== currentValue)
					: [...currentValues, currentValue];
				multiProps.onChange(nextValues);
			} else {
				const singleProps = props as SingleAsyncSelectProps<T>;
				const newValue =
					clearable && currentValue === singleProps.value ? "" : currentValue;
				singleProps.onChange(newValue);
				setOpen(false);
			}
		},
		[multiple, props, clearable],
	);

	const handleRemoveTag = useCallback(
		(valToRemove: string, e: React.MouseEvent | React.KeyboardEvent) => {
			e.stopPropagation();
			if (multiple) {
				const multiProps = props as MultiAsyncSelectProps<T>;
				const currentValues = multiProps.value ?? [];
				multiProps.onChange(currentValues.filter((v) => v !== valToRemove));
			}
		},
		[multiple, props],
	);

	const renderTriggerContent = () => {
		if (multiple) {
			const multiProps = props as MultiAsyncSelectProps<T>;
			const selectedValues = multiProps.value ?? [];
			if (selectedValues.length === 0) {
				return <span className="text-muted-foreground">{placeholder}</span>;
			}

			const maxTags = multiProps.maxDisplayedTags ?? 3;
			const visibleValues = selectedValues.slice(0, maxTags);
			const remainingCount = selectedValues.length - visibleValues.length;

			return (
				<div className="flex flex-wrap items-center gap-1 py-0.5 overflow-hidden">
					{visibleValues.map((val) => {
						const opt = optionsCacheRef.current.get(val);
						const displayContent = opt ? getDisplayValueRef.current(opt) : val;

						return (
							<span
								key={val}
								className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
							>
								<span>{displayContent}</span>
								<span
									role="button"
									tabIndex={0}
									onClick={(e) => handleRemoveTag(val, e)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											handleRemoveTag(val, e);
										}
									}}
									className="rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors cursor-pointer"
								>
									<X className="h-3 w-3" />
								</span>
							</span>
						);
					})}
					{remainingCount > 0 && (
						<span className="rounded bg-secondary/80 px-1.5 py-0.5 text-xs text-muted-foreground">
							+{remainingCount} مورد دیگر
						</span>
					)}
				</div>
			);
		}

		const singleProps = props as SingleAsyncSelectProps<T>;
		const selectedVal = singleProps.value;
		if (!selectedVal) {
			return <span className="text-muted-foreground">{placeholder}</span>;
		}

		const opt = optionsCacheRef.current.get(selectedVal);
		return opt ? getDisplayValueRef.current(opt) : selectedVal;
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							"h-auto min-h-9 w-full justify-between items-center text-start font-normal",
							disabled && "opacity-50 cursor-not-allowed",
							triggerClassName,
						)}
						style={{ width }}
						disabled={disabled}
					>
						<div className="flex-1 overflow-hidden">{renderTriggerContent()}</div>
						<ChevronsUpDown className="opacity-50 shrink-0 ml-2" size={14} />
					</Button>
				}
			/>
			<PopoverContent style={{ width }} className={cn("p-0", className)}>
				<Command shouldFilter={false}>
					<div className="relative border-b w-full">
						<CommandInput
							placeholder={`جستجو ${label}...`}
							value={searchTerm}
							onValueChange={(value) => {
								setSearchTerm(value);
							}}
						/>
						{loading && options.length > 0 && (
							<div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center">
								<Loader2 className="h-4 w-4 animate-spin" />
							</div>
						)}
					</div>
					<CommandList>
						{error && (
							<div className="p-4 text-destructive text-center">{error}</div>
						)}
						{loading && options.length === 0 && (
							loadingSkeleton || <DefaultLoadingSkeleton />
						)}
						{!loading && !error && options.length === 0 && (
							notFound || (
								<CommandEmpty>
									{noResultsMessage ?? `هیچ ${label} یافت نشد.`}
								</CommandEmpty>
							)
						)}
						<CommandGroup>
							{options.map((option) => {
								const optValue = getOptionValueRef.current(option);
								const selected = isSelected(optValue);
								return (
									<CommandItem
										key={optValue}
										value={optValue}
										onSelect={() => handleSelect(optValue)}
									>
										<div className="flex-1">{renderOption(option)}</div>
										<Check
											className={cn(
												"ml-auto h-4 w-4 shrink-0",
												selected ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

function DefaultLoadingSkeleton() {
	return (
		<CommandGroup>
			{[1, 2, 3].map((i) => (
				<CommandItem key={i} disabled>
					<div className="flex items-center gap-2 w-full">
						<div className="h-6 w-6 rounded-full animate-pulse bg-muted" />
						<div className="flex flex-col flex-1 gap-1">
							<div className="h-4 w-24 animate-pulse bg-muted rounded" />
							<div className="h-3 w-16 animate-pulse bg-muted rounded" />
						</div>
					</div>
				</CommandItem>
			))}
		</CommandGroup>
	);
}