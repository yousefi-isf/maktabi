import { School, Calendar, BookOpen, GraduationCap, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportCardPreviewData } from './types';

interface PreviewSummaryProps {
	previewData: ReportCardPreviewData;
}

export function PreviewSummary({ previewData }: PreviewSummaryProps) {
	const { school, totalStudents } = previewData;

	return (
		<Card className="bg-card">
			<CardHeader className="pb-3 border-b">
				<CardTitle className="text-base flex items-center gap-2">
					<School className="w-5 h-5 text-primary" />
					مشخصات استخراج‌شده مدرسه و سال تحصیلی
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-right">
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<School className="w-3.5 h-3.5" /> نام مدرسه
					</p>
					<p className="font-medium text-sm">{school.name}</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<MapPin className="w-3.5 h-3.5" /> کد و منطقه
					</p>
					<p className="font-medium text-sm">{school.code} ({school.district})</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<Calendar className="w-3.5 h-3.5" /> سال تحصیلی
					</p>
					<p className="font-medium text-sm">{school.academicYear} ({school.period})</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<GraduationCap className="w-3.5 h-3.5" /> پایه تحصیلی
					</p>
					<p className="font-medium text-sm">{school.gradeTitle}</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<BookOpen className="w-3.5 h-3.5" /> رشته تحصیلی
					</p>
					<p className="font-medium text-sm truncate" title={school.fieldTitle}>{school.fieldTitle}</p>
				</div>

				<div className="space-y-1">
					<p className="text-xs text-muted-foreground flex items-center gap-1">
						<Users className="w-3.5 h-3.5" /> تعداد دانش‌آموزان
					</p>
					<p className="font-semibold text-sm text-primary">{totalStudents} نفر</p>
				</div>
			</CardContent>
		</Card>
	);
}
