import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileDropzoneProps {
	onProcess: (fileBase64: string) => void;
	isLoading: boolean;
}

export function FileDropzone({ onProcess, isLoading }: FileDropzoneProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = (file: File) => {
		setError(null);
		if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
			setError('فقط فایل‌های PDF قابل قبول هستند.');
			return;
		}

		if (file.size > 30 * 1024 * 1024) {
			setError('حجم فایل نباید بیشتر از ۳۰ مگابایت باشد.');
			return;
		}

		setSelectedFile(file);
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isLoading) setIsDragOver(true);
	};

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
		if (isLoading) return;

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		setError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleStartProcess = () => {
		if (!selectedFile) return;

		const reader = new FileReader();
		reader.onload = () => {
			const base64 = reader.result as string;
			onProcess(base64);
		};
		reader.onerror = () => {
			setError('خطا در خواندن فایل. لطفاً دوباره تلاش کنید.');
		};
		reader.readAsDataURL(selectedFile);
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} بایت`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} مگابایت`;
	};

	return (
		<Card className="border-dashed border-2">
			<CardContent className="p-8 flex flex-col items-center text-center">
				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,application/pdf"
					className="hidden"
					onChange={handleInputChange}
					disabled={isLoading}
				/>

				{!selectedFile ? (
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => !isLoading && fileInputRef.current?.click()}
						className={`w-full py-12 px-6 rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center gap-4 ${
							isDragOver
								? 'bg-primary/10 border-primary'
								: 'bg-muted/40 hover:bg-muted/70'
						}`}
					>
						<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
							<FileUp className="w-8 h-8" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-base">
								فایل PDF کارنامه را اینجا بکشید یا برای انتخاب کلیک کنید
							</p>
							<p className="text-xs text-muted-foreground">
								پشتیبانی از کارنامه‌های دوره‌ای فنی‌وحرفه‌ای سامانه سیدا (حداکثر ۳۰ مگابایت)
							</p>
						</div>
					</div>
				) : (
					<div className="w-full space-y-6">
						<div className="flex items-center justify-between p-4 bg-muted/60 rounded-lg border">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
									<FileText className="w-6 h-6" />
								</div>
								<div className="text-right">
									<p className="font-medium text-sm truncate max-w-xs md:max-w-md">
										{selectedFile.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatFileSize(selectedFile.size)}
									</p>
								</div>
							</div>
							{!isLoading && (
								<Button
									variant="ghost"
									size="icon"
									onClick={handleRemoveFile}
									className="text-muted-foreground hover:text-destructive"
								>
									<X className="w-5 h-5" />
								</Button>
							)}
						</div>

						{error && (
							<div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md text-right">
								<AlertCircle className="w-4 h-4 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<div className="flex justify-end gap-3">
							<Button
								variant="outline"
								onClick={handleRemoveFile}
								disabled={isLoading}
							>
								انصراف
							</Button>
							<Button
								onClick={handleStartProcess}
								disabled={isLoading}
								className="min-w-[140px]"
							>
								{isLoading ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin ml-2" />
										در حال پردازش PDF...
									</>
								) : (
									'پردازش و مشاهده پیش‌نمایش'
								)}
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
