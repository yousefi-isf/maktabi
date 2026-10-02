import { useState, useMemo, useEffect } from "react";
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
	formatDate,
	toShamsi,
	fromShamsi,
	daysInMonth,
	isToday,
	isSameDay,
	toPersianDigits,
	today,
	addDays,
} from "@/lib/persian-date";
import { cn } from "@/lib/utils";

const PERSIAN_MONTHS = [
	"فروردین",
	"اردیبهشت",
	"خرداد",
	"تیر",
	"مرداد",
	"شهریور",
	"مهر",
	"آبان",
	"آذر",
	"دی",
	"بهمن",
	"اسفند",
];

const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export interface JalaliDatePickerProps {
	value: Date;
	onChange: (date: Date) => void;
	maxDate?: Date;
	minDate?: Date;
	className?: string;
	triggerClassName?: string;
	showIcon?: boolean;
}

export function JalaliDatePicker({
	value,
	onChange,
	maxDate = today(),
	minDate,
	className,
	triggerClassName,
	showIcon = true,
}: JalaliDatePickerProps) {
	const [open, setOpen] = useState(false);

	// Calendar viewing state (year & month in Shamsi)
	const shamsiValue = useMemo(() => toShamsi(value), [value]);
	const [viewYear, setViewYear] = useState(() => shamsiValue.year);
	const [viewMonth, setViewMonth] = useState(() => shamsiValue.month);

	// Whenever popover opens or value changes, sync the view to the selected date
	useEffect(() => {
		if (open) {
			const current = toShamsi(value);
			setViewYear(current.year);
			setViewMonth(current.month);
		}
	}, [open, value]);

	const handlePrevMonth = () => {
		if (viewMonth === 1) {
			setViewYear((y) => y - 1);
			setViewMonth(12);
		} else {
			setViewMonth((m) => m - 1);
		}
	};

	const handleNextMonth = () => {
		if (viewMonth === 12) {
			setViewYear((y) => y + 1);
			setViewMonth(1);
		} else {
			setViewMonth((m) => m + 1);
		}
	};

	const firstDayOfMonth = useMemo(
		() => fromShamsi({ year: viewYear, month: viewMonth, day: 1 }),
		[viewYear, viewMonth],
	);

	const totalDays = useMemo(
		() => daysInMonth(firstDayOfMonth, "shamsi"),
		[firstDayOfMonth],
	);

	// In Iran, week starts on Saturday (0 = Sat, 1 = Sun, ..., 6 = Fri)
	// JavaScript getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
	const startWeekday = useMemo(
		() => (firstDayOfMonth.getDay() + 1) % 7,
		[firstDayOfMonth],
	);

	// Check if next month is beyond maxDate
	const isNextMonthDisabled = useMemo(() => {
		if (!maxDate) return false;
		const nextMonthFirstDay =
			viewMonth === 12
				? fromShamsi({ year: viewYear + 1, month: 1, day: 1 })
				: fromShamsi({ year: viewYear, month: viewMonth + 1, day: 1 });
		return nextMonthFirstDay.getTime() > maxDate.getTime();
	}, [viewYear, viewMonth, maxDate]);

	const handleSelectDay = (day: number) => {
		const newDate = fromShamsi({ year: viewYear, month: viewMonth, day });
		onChange(newDate);
		setOpen(false);
	};

	const handleQuickSelect = (date: Date) => {
		onChange(date);
		const s = toShamsi(date);
		setViewYear(s.year);
		setViewMonth(s.month);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				className={cn(
					"inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md hover:bg-muted transition-colors cursor-pointer select-none border border-transparent hover:border-border",
					triggerClassName,
				)}
			>
				{showIcon && <CalendarIcon size={14} className="text-primary shrink-0" />}
				<span className="truncate">{formatDate(value, "EEEE d MMMM yyyy")}</span>
			</PopoverTrigger>

			<PopoverContent
				align="center"
				side="bottom"
				className={cn("w-72 p-3 font-sans", className)}
			>
				{/* Quick selection presets */}
				<div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b">
					<Button
						type="button"
						variant={isToday(value) ? "default" : "outline"}
						size="xs"
						onClick={() => handleQuickSelect(today())}
						className="flex-1 text-xs"
					>
						امروز
					</Button>
					<Button
						type="button"
						variant={
							isSameDay(value, addDays(today(), -1)) ? "default" : "outline"
						}
						size="xs"
						onClick={() => handleQuickSelect(addDays(today(), -1))}
						className="flex-1 text-xs"
					>
						دیروز
					</Button>
				</div>

				{/* Month / Year header with navigation */}
				<div className="flex items-center justify-between mb-2 px-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={handlePrevMonth}
						title="ماه قبل"
						className="cursor-pointer"
					>
						<ChevronRight size={14} />
					</Button>

					<span className="text-xs font-semibold select-none">
						{PERSIAN_MONTHS[viewMonth - 1]} {toPersianDigits(String(viewYear))}
					</span>

					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={handleNextMonth}
						disabled={isNextMonthDisabled}
						title="ماه بعد"
						className="cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
					>
						<ChevronLeft size={14} />
					</Button>
				</div>

				{/* Weekdays header */}
				<div className="grid grid-cols-7 gap-1 text-center mb-1">
					{PERSIAN_WEEKDAYS.map((wd, i) => (
						<div
							key={i}
							className={cn(
								"text-[10px] font-medium py-1 text-muted-foreground select-none",
								i === 6 && "text-rose-500", // Friday in Iran is weekend
							)}
						>
							{wd}
						</div>
					))}
				</div>

				{/* Days grid */}
				<div className="grid grid-cols-7 gap-1 text-center">
					{/* Empty offset days */}
					{Array.from({ length: startWeekday }).map((_, index) => (
						<div key={`empty-${index}`} className="h-7 w-7" />
					))}

					{/* Days of month */}
					{Array.from({ length: totalDays }).map((_, index) => {
						const dayNum = index + 1;
						const dayDate = fromShamsi({
							year: viewYear,
							month: viewMonth,
							day: dayNum,
						});
						const isSelected = isSameDay(dayDate, value);
						const isCurrentDay = isToday(dayDate);
						const isFuture = maxDate
							? dayDate.getTime() > maxDate.getTime()
							: false;
						const isPastMin = minDate
							? dayDate.getTime() < minDate.getTime()
							: false;
						const isDisabled = isFuture || isPastMin;
						const isFriday = (startWeekday + index) % 7 === 6;

						return (
							<button
								key={dayNum}
								type="button"
								disabled={isDisabled}
								onClick={() => handleSelectDay(dayNum)}
								className={cn(
									"h-7 w-7 text-xs rounded-md flex items-center justify-center transition-all cursor-pointer select-none font-mono",
									isSelected
										? "bg-primary text-primary-foreground font-bold shadow-xs"
										: isCurrentDay
										  ? "border border-primary text-primary font-semibold hover:bg-primary/10"
										  : "hover:bg-muted text-foreground",
									isFriday && !isSelected && "text-rose-500 font-medium",
									isDisabled && "opacity-25 pointer-events-none",
								)}
							>
								{toPersianDigits(String(dayNum))}
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
