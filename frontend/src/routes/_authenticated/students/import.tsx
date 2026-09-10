import { createFileRoute } from '@tanstack/react-router';
import { ReportCardImporterView } from '@/features/report-card-importer';
import { guardPermission } from '@/lib/route-guards';

export const Route = createFileRoute('/_authenticated/students/import')({
	beforeLoad: guardPermission({
		anyOf: [
			'importer.report_card.preview',
			'importer.report_card.execute',
			'system.full_access',
		],
	}),
	component: RouteComponent,
});

function RouteComponent() {
	return <ReportCardImporterView />;
}
