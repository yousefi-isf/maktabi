import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	FileUp,
	Eye,
	CheckCircle,
	ArrowLeft,
	Loader2,
	Database,
	Users,
	BookOpen,
	TableProperties,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showTRPCErrorToast } from '@/lib/show-error-toast';
import { useTRPC } from '@/lib/trpc';
import { FileDropzone } from './file-dropzone';
import { PreviewSummary } from './preview-summary';
import { StudentsPreviewTable } from './students-preview-table';
import { CoursesPreviewTable } from './courses-preview-table';
import { ScoresMatrixPreviewTable } from './scores-matrix-preview-table';
import { ResultSummary } from './result-summary';
import type { ImporterStep, ReportCardPreviewData, ReportCardImportResult } from './types';

export function ReportCardImporterView() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [step, setStep] = useState<ImporterStep>('upload');
	const [previewTab, setPreviewTab] = useState<'students' | 'courses' | 'scores'>('students');
	const [previewData, setPreviewData] = useState<ReportCardPreviewData | null>(null);
	const [importResult, setImportResult] = useState<ReportCardImportResult | null>(null);

	const previewMutation = useMutation(
		trpc.reportCards.preview.mutationOptions({
			meta: { silentToast: true },
		}),
	);
	const importMutation = useMutation(
		trpc.reportCards.importBatch.mutationOptions({
			meta: { silentToast: true },
		}),
	);

	const handleProcessFile = async (fileBase64: string) => {
		try {
			const data = await previewMutation.mutateAsync({ fileBase64 });
			setPreviewData(data);
			setStep('preview');
			setPreviewTab('students');
			showSuccessToast(`فایل با موفقیت بازخوانی شد. ${data.totalStudents} کارنامه شناسایی گردید.`);
		} catch (err) {
			showTRPCErrorToast(err);
		}
	};

	const handleConfirmImport = async () => {
		if (!previewData) return;

		setStep('importing');
		try {
			const result = await importMutation.mutateAsync({ batch: previewData.batch });
			setImportResult(result);
			setStep('success');
			showSuccessToast('تمامی کارنامه‌ها و نمرات با موفقیت در پایگاه داده ثبت شدند.');

			await Promise.all([
				queryClient.invalidateQueries(trpc.students.list.pathFilter()),
				queryClient.invalidateQueries(trpc.academicYears.list.pathFilter()),
				queryClient.invalidateQueries(trpc.fieldsOfStudy.list.pathFilter()),
			]);
		} catch (err) {
			setStep('preview');
			showTRPCErrorToast(err);
		}
	};

	const handleReset = () => {
		setStep('upload');
		setPreviewData(null);
		setImportResult(null);
		setPreviewTab('students');
	};

	return (
		<div className="space-y-6 max-w-6xl mx-auto py-4">
			{/* Wizard Progress Steps Header */}
			<div className="flex items-center justify-between border-b pb-4 px-2">
				<div className="space-y-1 text-right">
					<h2 className="text-xl font-bold tracking-tight">بارگذاری کارنامه (PDF)</h2>
					<p className="text-xs text-muted-foreground">
						استخراج هوشمند اطلاعات هویتی، دروس، پودمان‌ها و نمرات از فایل کارنامه آموزش و پرورش
					</p>
				</div>

				<div className="flex items-center gap-3 text-xs">
					<div
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors ${
							step === 'upload'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'
						}`}
					>
						<FileUp className="w-3.5 h-3.5" />
						<span>۱. انتخاب فایل</span>
					</div>

					<div className="w-4 h-px bg-border" />

					<div
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors ${
							step === 'preview' || step === 'importing'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'
						}`}
					>
						<Eye className="w-3.5 h-3.5" />
						<span>۲. بررسی پیش‌نمایش</span>
					</div>

					<div className="w-4 h-px bg-border" />

					<div
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors ${
							step === 'success'
								? 'bg-emerald-600 text-white'
								: 'bg-muted text-muted-foreground'
						}`}
					>
						<CheckCircle className="w-3.5 h-3.5" />
						<span>۳. ثبت در سیستم</span>
					</div>
				</div>
			</div>

			{/* Step 1: Upload */}
			{step === 'upload' && (
				<div className="py-4 space-y-4">
					<FileDropzone
						onProcess={handleProcessFile}
						isLoading={previewMutation.isPending}
					/>
				</div>
			)}

			{/* Step 2: Preview & Inspection */}
			{(step === 'preview' || step === 'importing') && previewData && (
				<div className="space-y-6">
					<PreviewSummary previewData={previewData} />

					{/* Navigation Tabs Bar */}
					<div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
						<div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
							<button
								type="button"
								onClick={() => setPreviewTab('students')}
								className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
									previewTab === 'students'
										? 'bg-background text-foreground shadow-xs'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Users className="w-4 h-4 text-primary" />
								<span>دانش‌آموزان ({previewData.students.length} نفر)</span>
							</button>

							<button
								type="button"
								onClick={() => setPreviewTab('courses')}
								className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
									previewTab === 'courses'
										? 'bg-background text-foreground shadow-xs'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<BookOpen className="w-4 h-4 text-primary" />
								<span>لیست دروس و واحدها</span>
							</button>

							<button
								type="button"
								onClick={() => setPreviewTab('scores')}
								className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
									previewTab === 'scores'
										? 'bg-background text-foreground shadow-xs'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<TableProperties className="w-4 h-4 text-primary" />
								<span>ماتریس نمرات کلاسی</span>
							</button>
						</div>

						<span className="text-xs text-muted-foreground">
							{previewTab === 'students' && 'مشاهده اطلاعات فردی و دسترسی به ریزنمرات کارنامه'}
							{previewTab === 'courses' && 'مشاهده عناوین درسی، تعداد واحد و نوع ساختار (نظری/پودمانی)'}
							{previewTab === 'scores' && 'نمای جامع نمرات تمام دانش‌آموزان در تمام دروس'}
						</span>
					</div>

					{/* Tab Content 1: Students */}
					{previewTab === 'students' && (
						<StudentsPreviewTable
							students={previewData.students}
							batch={previewData.batch}
						/>
					)}

					{/* Tab Content 2: Courses */}
					{previewTab === 'courses' && (
						<CoursesPreviewTable batch={previewData.batch} />
					)}

					{/* Tab Content 3: Scores Matrix */}
					{previewTab === 'scores' && (
						<ScoresMatrixPreviewTable batch={previewData.batch} />
					)}

					{/* Action Buttons */}
					<div className="flex items-center justify-between pt-4 border-t">
						<Button
							variant="outline"
							onClick={handleReset}
							disabled={step === 'importing'}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="w-4 h-4" />
							انصراف و انتخاب فایل دیگر
						</Button>

						<Button
							onClick={handleConfirmImport}
							disabled={step === 'importing'}
							className="min-w-[180px] flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
						>
							{step === 'importing' ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin ml-2" />
									در حال ثبت اطلاعات در دیتابیس...
								</>
							) : (
								<>
									<Database className="w-4 h-4" />
									تأیید و ذخیره در سیستم
								</>
							)}
						</Button>
					</div>
				</div>
			)}

			{/* Step 3: Success Report */}
			{step === 'success' && importResult && (
				<ResultSummary
					result={importResult}
					onReset={handleReset}
				/>
			)}
		</div>
	);
}
