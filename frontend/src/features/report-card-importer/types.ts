import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../../backend/src/trpc/router.js';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ReportCardPreviewData = RouterOutputs['reportCards']['preview'];
export type ReportCardImportResult = RouterOutputs['reportCards']['importBatch'];
export type ReportCardBatchDto = ReportCardPreviewData['batch'];
export type SingleStudentReportCard = ReportCardBatchDto['students'][number];
export type ReportCardCourse = SingleStudentReportCard['courses'][number];
export type ReportCardModule = ReportCardCourse['modules'][number];

export type ImporterStep = 'upload' | 'preview' | 'importing' | 'success';
