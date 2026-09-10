import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../../backend/src/trpc/router.js';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type StudentRankingsResult = RouterOutputs['rankings']['getStudentRankings'];
export type StudentRankingItem = StudentRankingsResult['rankings'][number];
export type RankingFilterOptions = RouterOutputs['rankings']['getFilterOptions'];

export interface RankingFilterState {
	academicYearId: string;
	gradeLevelId: string;
	fieldOfStudyId: string;
	classId: string;
}

