import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface ReportCardTextInputProps {
	text: string;
	onChange: (value: string) => void;
	onProcess: () => void;
	isLoading: boolean;
	error?: string;
}

export function ReportCardTextInput({
	text,
	onChange,
	onProcess,
	isLoading,
	error,
}: ReportCardTextInputProps) {
	return (
		<Card>
			<CardContent className="space-y-4 p-6 text-right">
				<label
					htmlFor="report-card-text"
					className="flex items-center gap-2 font-medium"
				>
					<FileText className="size-5 text-primary" /> متن کارنامه‌ها
				</label>
				<p id="report-card-text-help" className="text-sm text-muted-foreground">
					متن کامل یک یا چند کارنامه را با حفظ جدول و سطرها اینجا جای‌گذاری کنید.
					همه کارنامه‌ها باید متعلق به یک مدرسه، پایه، رشته و سال تحصیلی باشند.
				</p>
				<Textarea
					id="report-card-text"
					dir="rtl"
					value={text}
					onChange={(event) => onChange(event.target.value)}
					disabled={isLoading}
					aria-describedby={`report-card-text-help${error ? " report-card-text-error" : ""}`}
					aria-invalid={Boolean(error)}
					placeholder="متن کارنامه را اینجا جای‌گذاری کنید…"
					className="min-h-80 max-h-[32rem] resize-y overflow-auto [field-sizing:fixed] whitespace-pre text-sm leading-7"
					spellCheck={false}
				/>
				{error && (
					<p
						id="report-card-text-error"
						role="alert"
						className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
					>
						{error}
					</p>
				)}
				<div className="flex justify-end">
					<Button onClick={onProcess} disabled={isLoading || !text.trim()}>
						{isLoading ? (
							<>
								<Loader2 className="size-4 animate-spin" /> در حال پردازش متن…
							</>
						) : (
							"پردازش و مشاهده پیش‌نمایش"
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
