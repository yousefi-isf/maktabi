import { Check, Minus, X } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScorePart {
	id: string;
	order: number | null;
	title: string | null;
	score: number | null;
	isAbsent?: boolean;
	isPassed?: boolean;
}

export function ScoreBreakdown({ parts }: { parts: ScorePart[] }) {
	if (parts.length === 0) {
		return (
			<span className="text-xs text-muted-foreground">نمره‌ای ثبت نشده</span>
		);
	}

	return (
		<div className="grid w-max grid-cols-5 gap-1.5 py-1" dir="rtl">
			{parts.map((part, index) => {
				const hasScore = part.score !== null && !part.isAbsent;
				const passed = hasScore && part.score! >= 10 && part.isPassed !== false;
				const status = part.isAbsent
					? "غایب"
					: !hasScore
						? "ثبت نشده"
						: passed
							? "قبول"
							: "نیاز به جبران";
				const score = part.isAbsent
					? "غایب"
					: (part.score?.toFixed(2).replace(/\.?0+$/, "") ?? "—");
				const order = (part.order ?? index + 1).toLocaleString("fa-IR");
				const title = part.title || `بخش ${order}`;
				const Icon = !hasScore ? Minus : passed ? Check : X;
				return (
					<Tooltip key={part.id}>
						<TooltipTrigger
							aria-label={`${title}، نمره ${score}، ${status}`}
							className={`flex min-h-14 w-14 flex-col gap-1 rounded-lg border px-1.5 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
								!hasScore
									? "border-border bg-muted/30 text-muted-foreground"
									: passed
										? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
										: "border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
							}`}
						>
							<span className="flex w-full items-center justify-between text-[11px] leading-none opacity-75">
								<span>{order}</span>
								<Icon className="size-3" aria-hidden="true" />
							</span>
							<span
								dir="ltr"
								className="self-center text-sm font-semibold tabular-nums leading-5"
							>
								{score}
							</span>
						</TooltipTrigger>
						<TooltipContent
							className="flex-col items-start gap-1 text-right"
							dir="rtl"
						>
							<span className="max-w-64 whitespace-normal leading-5">
								{title}
							</span>
							<span className="text-background/75">
								نمره: {score} · {status}
							</span>
						</TooltipContent>
					</Tooltip>
				);
			})}
		</div>
	);
}
