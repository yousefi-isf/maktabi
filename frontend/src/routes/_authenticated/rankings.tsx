import { createFileRoute } from "@tanstack/react-router";
import { StudentRankingsView } from "@/features/rankings";
import { guardPermission } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/rankings")({
	beforeLoad: guardPermission({
		anyOf: [
			"identity.student.list",
			"assessment.score.read",
			"system.full_access",
		],
	}),
	component: StudentRankingsView,
});
