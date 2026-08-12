import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";

export function NotFoundPage() {
	return (
		<main className="grid min-h-screen place-content-center text-center">
			<h1 className="text-6xl font-bold">404</h1>
			<p className="mt-4">صفحه موردنظر پیدا نشد.</p>
			<Button type="button" variant={"link"}>
				<Link to="/">بازگشت به خانه</Link>
			</Button>
		</main>
	);
}
