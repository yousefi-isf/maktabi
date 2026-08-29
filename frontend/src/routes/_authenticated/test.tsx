import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/test")({
	staticData: {
		breadcrumb: "آزمایش",
	},
	component: RouteComponent,
});

function RouteComponent() {
	// const health = useQuery(trpc.health.queryOptions());
	// const { data: schoolCount } = useQuery(trpc.schools.count.queryOptions());

	// if (health.isPending || schoolCount.isPending) {
	//   return <p>Loading…</p>;
	// }

	// if (health.error || schoolCount.error) {
	//   return <p>{health.error?.message ?? schoolCount.error?.message}</p>;
	// }

	return (
		<div>test

		</div>
	);
}
