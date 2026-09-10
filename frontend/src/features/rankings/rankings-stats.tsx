import { CheckCircle2, TrendingUp, Trophy, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { StudentRankingsResult } from './types';

interface RankingsStatsProps {
	data: StudentRankingsResult;
}

export function RankingsStats({ data }: RankingsStatsProps) {
	const topStudent = data.rankings[0];
	const passRate = data.totalStudents > 0 ? (data.passedStudentsCount / data.totalStudents) * 100 : 0;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* Top Student */}
			<Card className="p-4 bg-gradient-to-br from-amber-500/10 via-background to-background border-amber-500/20">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">بالاترین معدل (رتبه ۱)</span>
					<div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600">
						<Trophy className="w-4 h-4" />
					</div>
				</div>
				<div className="mt-3 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
						{data.highestGpa.toFixed(2)}
					</span>
					{topStudent && (
						<span className="text-xs text-foreground font-medium truncate max-w-[140px]">
							{topStudent.fullName}
						</span>
					)}
				</div>
			</Card>

			{/* Average GPA */}
			<Card className="p-4 bg-gradient-to-br from-sky-500/10 via-background to-background border-sky-500/20">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">میانگین معدل‌ها</span>
					<div className="w-8 h-8 rounded-full bg-sky-500/15 flex items-center justify-center text-sky-600">
						<TrendingUp className="w-4 h-4" />
					</div>
				</div>
				<div className="mt-2 flex items-baseline justify-between">
					<div>
						<span className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
							{data.averageGpa.toFixed(2)}
						</span>
						<span className="text-[10px] text-muted-foreground block">معدل کل</span>
					</div>
					<div className="text-left text-[11px] text-muted-foreground space-y-0.5 bg-background/60 px-2 py-1 rounded border border-border/50">
						<div>مستمر: <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{data.averageContinuousGpa.toFixed(2)}</span></div>
						<div>پایانی: <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{data.averageFinalGpa.toFixed(2)}</span></div>
					</div>
				</div>
			</Card>

			{/* Pass Rate */}
			<Card className="p-4 bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/20">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">قبول کامل</span>
					<div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600">
						<CheckCircle2 className="w-4 h-4" />
					</div>
				</div>
				<div className="mt-3 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
						{data.passedStudentsCount}
					</span>
					<span className="text-xs text-muted-foreground">
						نفر ({passRate.toFixed(0)}٪ کل)
					</span>
				</div>
			</Card>

			{/* Total Students */}
			<Card className="p-4 bg-gradient-to-br from-purple-500/10 via-background to-background border-purple-500/20">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">کل دانش‌آموزان</span>
					<div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-600">
						<Users className="w-4 h-4" />
					</div>
				</div>
				<div className="mt-3 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
						{data.totalStudents}
					</span>
					<span className="text-xs text-muted-foreground">
						دانش‌آموز رتبه‌بندی‌شده
					</span>
				</div>
			</Card>
		</div>
	);
}

