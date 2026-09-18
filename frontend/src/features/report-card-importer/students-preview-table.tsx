import { useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { StudentReportCardDialog } from './student-report-card-dialog';
import type { ReportCardPreviewData, SingleStudentReportCard } from './types';

interface StudentsPreviewTableProps {
	students: ReportCardPreviewData['students'];
	batch: ReportCardPreviewData['batch'];
	onUpdateBatch?: (batch: ReportCardPreviewData['batch']) => void;
}

export function StudentsPreviewTable({ students, batch, onUpdateBatch }: StudentsPreviewTableProps) {
	const [selectedStudent, setSelectedStudent] = useState<SingleStudentReportCard | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleOpenStudentReport = (nationalCode: string) => {
		const found = batch.students.find((s) => s.student.nationalCode === nationalCode);
		if (found) {
			setSelectedStudent(found);
			setDialogOpen(true);
		}
	};

	return (
		<>
			<Card>
				<CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
					<CardTitle className="text-base font-medium">
						لیست دانش آموزان ({students.length} دانش‌آموز)
					</CardTitle>
					<span className="text-xs text-muted-foreground">
						با کلیک روی دکمه کارنامه، جزئیات دروس و نمرات هر شخص قابل مشاهده است
					</span>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12 text-center">#</TableHead>
								<TableHead>نام و نام خانوادگی</TableHead>
								<TableHead>کد ملی</TableHead>
								<TableHead>شماره دانش‌آموزی</TableHead>
								<TableHead>نام پدر</TableHead>
								<TableHead className="text-center">تعداد دروس</TableHead>
								<TableHead className="text-center">واحد قبولی / کل</TableHead>
								<TableHead className="text-center">معدل کل</TableHead>
								<TableHead className="text-center">وضعیت</TableHead>
								<TableHead className="w-24 text-center">کارنامه</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{students.map((s, idx) => {
								const isComplete = s.unitsPassed >= s.unitsTaken;
								return (
									<TableRow key={s.nationalCode || idx} className="hover:bg-muted/30">
										<TableCell className="text-center font-mono text-xs text-muted-foreground">
											{idx + 1}
										</TableCell>
										<TableCell className="font-medium p-1">
											<input
												type="text"
												className="w-full h-8 px-2 text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors"
												defaultValue={s.fullName}
												onBlur={(e) => {
													const val = e.target.value.trim();
													if (!val || !onUpdateBatch) return;
													
													const newBatch = { ...batch };
													const studentIndex = newBatch.students.findIndex(bs => bs.student.nationalCode === s.nationalCode);
													if (studentIndex >= 0) {
														const parts = val.split(' ');
														const lastName = parts.length > 1 ? parts.pop() || '' : '';
														const firstName = parts.join(' ') || val;
														newBatch.students[studentIndex].student.firstName = firstName;
														newBatch.students[studentIndex].student.lastName = lastName;
														onUpdateBatch(newBatch);
													}
												}}
											/>
										</TableCell>
										<TableCell className="font-mono text-xs">
											{s.nationalCode}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{s.studentNumber}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{s.fatherName || '-'}
										</TableCell>
										<TableCell className="text-center font-mono text-xs">
											{s.coursesCount}
										</TableCell>
										<TableCell className="text-center font-mono text-xs">
											<span className={isComplete ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
												{s.unitsPassed}
											</span>
											{' '}/ {s.unitsTaken}
										</TableCell>
										<TableCell className="text-center font-mono font-semibold text-sm">
											<span className={s.gpa >= 12 ? 'text-foreground' : 'text-destructive'}>
												{s.gpa.toFixed(2)}
											</span>
										</TableCell>
										<TableCell className="text-center">
											{isComplete ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
													قبول کامل
												</span>
											) : (
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
													ناقص ({s.unitsTaken - s.unitsPassed} واحد مانده)
												</span>
											)}
										</TableCell>
										<TableCell className="text-center">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleOpenStudentReport(s.nationalCode)}
												className="h-7 text-xs px-2.5 flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
											>
												<FileText className="w-3.5 h-3.5" />
												<span>نمایش کارنامه</span>
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<StudentReportCardDialog
				student={selectedStudent}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
			/>
		</>
	);
}
