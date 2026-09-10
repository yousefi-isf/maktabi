import { CheckCircle2, Users, Award, BookCheck, ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportCardImportResult } from './types';

interface ResultSummaryProps {
	result: ReportCardImportResult;
	onReset: () => void;
}

export function ResultSummary({ result, onReset }: ResultSummaryProps) {
	return (
		<div className="space-y-6">
			<Card className="border-emerald-500/20 bg-emerald-500/5">
				<CardHeader className="pb-3 flex flex-row items-center gap-3">
					<div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
						<CheckCircle2 className="w-7 h-7" />
					</div>
					<div>
						<CardTitle className="text-lg text-emerald-700">
							اطلاعات کارنامه با موفقیت در پایگاه داده ثبت شد!
						</CardTitle>
						<p className="text-xs text-muted-foreground mt-1">
							کلاس، دروس، آزمون‌ها و نمرات دانش‌آموزان با موفقیت در مدرسه {result.schoolName} ایجاد و به‌روزرسانی شدند.
						</p>
					</div>
				</CardHeader>
				<CardContent className="pt-2">
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-background border">
						<div className="space-y-1 text-right">
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								<BookCheck className="w-3.5 h-3.5 text-primary" /> نام کلاس
							</p>
							<p className="font-medium text-sm truncate">{result.className}</p>
						</div>

						<div className="space-y-1 text-right">
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								<Users className="w-3.5 h-3.5 text-primary" /> کل دانش‌آموزان
							</p>
							<p className="font-semibold text-sm font-mono">{result.totalStudentsProcessed} نفر</p>
						</div>

						<div className="space-y-1 text-right">
							<p className="text-xs text-muted-foreground">ایجاد جدید / ویرایش</p>
							<p className="font-medium text-sm font-mono">
								<span className="text-emerald-600 font-bold">{result.studentsCreated}</span> جدید
								{' '}-{' '}
								<span className="text-muted-foreground">{result.studentsUpdated}</span> قبلی
							</p>
						</div>

						<div className="space-y-1 text-right">
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								<Award className="w-3.5 h-3.5 text-primary" /> نمرات ثبت‌شده
							</p>
							<p className="font-semibold text-sm font-mono text-primary">{result.scoresUpserted} نمره</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-3 mt-6">
						<Button
							variant="outline"
							onClick={onReset}
							className="flex items-center gap-2"
						>
							<RotateCcw className="w-4 h-4" />
							بارگذاری کارنامه دیگر
						</Button>
						<Button
							className="flex items-center gap-2"
							render={<Link to="/students" />}
						>
							مشاهده لیست دانش‌آموزان
							<ArrowRight className="w-4 h-4 rotate-180" />
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
