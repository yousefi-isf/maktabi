import { Link, useMatches } from "@tanstack/react-router";
import { Fragment } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { SidebarTrigger } from "./ui/sidebar";

function Header() {
	const matchedBreadcrumbs = useMatches({
		select: (matches) =>
			matches.flatMap((match) => {
				const label = match.staticData.breadcrumb;

				return label
					? [
							{
								id: match.id,
								label,
								pathname: match.pathname,
							},
						]
					: [];
			}),
	});
	const breadcrumbs = matchedBreadcrumbs.some(
		(breadcrumb) => breadcrumb.pathname === "/",
	)
		? matchedBreadcrumbs
		: [
				{
					id: "home",
					label: "خانه",
					pathname: "/",
				},
				...matchedBreadcrumbs,
			];

	return (
		<header className="flex h-16 shrink-0 w-full items-center gap-3 ps-2 transition-[width,height] ease-linear">
			<SidebarTrigger />

			<Breadcrumb>
				<BreadcrumbList>
					{breadcrumbs.map((breadcrumb, index) => {
						const isCurrent = index === breadcrumbs.length - 1;

						return (
							<Fragment key={breadcrumb.id}>
								{index > 0 && (
									<BreadcrumbSeparator className="hidden md:block" />
								)}
								<BreadcrumbItem
									className={isCurrent ? undefined : "hidden md:inline-flex"}
								>
									{isCurrent ? (
										<BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
									) : (
										<BreadcrumbLink render={<Link to={breadcrumb.pathname} />}>
											{breadcrumb.label}
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
							</Fragment>
						);
					})}
				</BreadcrumbList>
			</Breadcrumb>
		</header>
	);
}

export default Header;
