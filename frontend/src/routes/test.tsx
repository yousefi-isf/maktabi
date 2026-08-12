import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";

export const Route = createFileRoute("/test")({
	staticData: {
		breadcrumb: "آزمایش",
	},
	component: RouteComponent,
});

function RouteComponent() {
	const trpc = useTRPC();

	const health = useQuery(trpc.health.queryOptions());
	const { data: schoolCount } = useQuery(trpc.schools.count.queryOptions());

	// if (health.isPending || schoolCount.isPending) {
	//   return <p>Loading…</p>;
	// }

	// if (health.error || schoolCount.error) {
	//   return <p>{health.error?.message ?? schoolCount.error?.message}</p>;
	// }

	return (
		<div>
			{/* <p>Backend status: {health.data.status}</p> */}
			<p>Schools: {schoolCount}</p>
		</div>
	);
}
