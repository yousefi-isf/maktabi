import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Search, Trophy, Medal, Award, UserCheck, AlertCircle } from 'lucide-react';
import type { StudentRankingItem } from './types';

interface RankingsTableProps {
	rankings: StudentRankingItem[];
	title?: string;
}

export function RankingsTable({ rankings, title }: RankingsTableProps) {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredRankings = useMemo(() => {
		if (!searchQuery.trim()) return rankings;
		const q = searchQuery.toLowerCase().trim();
		return rankings.filter(
			(r) =>
				r.fullName.toLowerCase().includes(q) ||
				r.nationalCode.includes(q) ||
				r.studentNumber.includes(q) ||
				r.className.toLowerCase().includes(q) ||
				r.fieldTitle.toLowerCase().includes(q)
		);
	}, [rankings, searchQuery]);

	// Helper for rank badge rendering
	const renderRankBadge = (rank: number) => {
		if (rank === 1) {
			return (
				<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold font-mono text-xs border border-amber-500/30 shadow-xs">
					<Trophy className="w-3.5 h-3.5" />
					<span>۱</span>
				</div>
			);
		}
		if (rank === 2) {
			return (
				<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-300/30 text-slate-700 dark:text-slate-300 font-bold font-mono text-xs border border-slate-400/30 shadow-xs">
					<Medal className="w-3.5 h-3.5" />
					<span>۲</span>
				</div>
			);
		}
		if (rank === 3) {
			return (
				<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-bold font-mono text-xs border border-amber-700/30 shadow-xs">
					<Award className="w-3.5 h-3.5" />
					<span>۳</span>
				</div>
			);
		}
		return (
			<span className="font-mono font-medium text-xs text-muted-foreground">
				{rank}
			</span>
		);
	};

	return (
		<Card>
			<CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<CardTitle className="text-base font-medium">
						{title || `جدول رتبه‌بندی تحصیلی (${rankings.length} دانش‌آموز)`}
					</CardTitle>
					<span className="text-xs text-muted-foreground mt-0.5 block">
						مرتب‌شده بر اساس بالاترین معدل کل (با اولویت حروف الفبا در معدل‌های برابر)
					</span>
				</div>

				<div className="relative w-full sm:w-64">
					<Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="جستجوی نام، کدملی، کلاس..."
						className="w-full h-8 pr-9 pl-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
					/>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<Table>
					<TableHeader className="bg-muted/40">
						<TableRow>
							<TableHead className="w-16 text-center">رتبه کل</TableHead>
							<TableHead className="w-20 text-center">رتبه کلاس</TableHead>
							<TableHead>نام و نام خانوادگی</TableHead>
							<TableHead>کد ملی</TableHead>
							<TableHead>کلاس / رشته</TableHead>
							<TableHead className="text-center">معدل مستمر</TableHead>
							<TableHead className="text-center">معدل پایانی</TableHead>
							<TableHead className="text-center">معدل کل</TableHead>
							<TableHead className="text-center">واحد قبولی / کل</TableHead>
							<TableHead className="text-center">مجموع نمرات</TableHead>
							<TableHead className="text-center">وضعیت</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredRankings.length === 0 ? (
							<TableRow>
								<TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-xs">
									دانش‌آموزی مطابق فیلترهای انتخابی یافت نشد.
								</TableCell>
							</TableRow>
						) : (
							filteredRankings.map((r) => {
								const isComplete = r.unitsPassed >= r.unitsTaken;
								return (
									<TableRow
										key={r.studentId}
										className={`hover:bg-muted/30 transition-colors ${
											r.rankInGradeField <= 3 ? 'bg-muted/15' : ''
										}`}
									>
										{/* Overall Rank */}
										<TableCell className="text-center">
											{renderRankBadge(r.rankInGradeField)}
										</TableCell>

										{/* Class Rank */}
										<TableCell className="text-center font-mono text-xs font-semibold text-muted-foreground">
											{r.rankInClass}
										</TableCell>

										{/* Student Name */}
										<TableCell className="font-medium text-xs whitespace-nowrap">
											{r.fullName}
											{r.fatherName && (
												<span className="text-[10px] text-muted-foreground mr-1">
													(فرزند {r.fatherName})
												</span>
											)}
										</TableCell>

										{/* National Code */}
										<TableCell className="font-mono text-xs text-muted-foreground">
											{r.nationalCode}
										</TableCell>

										{/* Class & Field */}
										<TableCell className="text-xs">
											<span className="font-medium text-foreground block">{r.className}</span>
											<span className="text-[10px] text-muted-foreground">{r.fieldTitle}</span>
										</TableCell>

										{/* GPA */}
										{/* Continuous GPA */}
										<TableCell className="text-center font-mono font-medium text-xs">
											<span className="inline-block px-2 py-0.5 rounded text-sky-700 dark:text-sky-400 bg-sky-500/10">
												{r.continuousGpa > 0 ? r.continuousGpa.toFixed(2) : '-'}
											</span>
										</TableCell>

										{/* Final GPA */}
										<TableCell className="text-center font-mono font-medium text-xs">
											<span className="inline-block px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-400 bg-indigo-500/10">
												{r.finalGpa > 0 ? r.finalGpa.toFixed(2) : '-'}
											</span>
										</TableCell>

										{/* Overall GPA */}
										<TableCell className="text-center font-mono font-bold text-sm">
											<span
												className={`inline-block px-2.5 py-0.5 rounded shadow-xs ${
													r.gpa >= 17
														? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/20'
														: r.gpa >= 14
														? 'text-sky-700 dark:text-sky-400 bg-sky-500/15 border border-sky-500/20'
														: r.gpa >= 12
														? 'text-foreground bg-muted border border-border'
														: 'text-rose-700 dark:text-rose-400 bg-rose-500/15 border border-rose-500/20'
												}`}
											>
												{r.gpa.toFixed(2)}
											</span>
										</TableCell>

										{/* Units */}
										<TableCell className="text-center font-mono text-xs">
											<span className={isComplete ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
												{r.unitsPassed}
											</span>
											{' '}/ {r.unitsTaken}
										</TableCell>

										{/* Score Sum */}
										<TableCell className="text-center font-mono text-xs text-muted-foreground">
											{r.totalScoreSum > 0 ? r.totalScoreSum.toFixed(1) : '-'}
										</TableCell>

										{/* Status */}
										<TableCell className="text-center whitespace-nowrap">
											{isComplete ? (
												<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600">
													<UserCheck className="w-3.5 h-3.5" />
													قبول کامل
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600">
													<AlertCircle className="w-3.5 h-3.5" />
													{r.unitsTaken - r.unitsPassed} واحد مانده
												</span>
											)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

