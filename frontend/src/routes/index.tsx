import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	staticData: {
		breadcrumb: "خانه",
	},
	component: HomePage,
});

function HomePage() {
	return <div>صفحه اصلی</div>;
}
