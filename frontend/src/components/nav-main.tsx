import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { PermissionNavItem } from "@/lib/permissions";

export function NavMain({
	items,
}: {
	items: readonly PermissionNavItem[];
}) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	const isUrlActive = (url: string) =>
		pathname === url || pathname.startsWith(`${url}/`);

	return (
		<SidebarGroup>
			<SidebarGroupLabel>عمومی</SidebarGroupLabel>
			<SidebarMenu>
			{items.map((item) => {
				const isActive =
					"items" in item
						? item.items.some((subItem) => "url" in subItem && isUrlActive(subItem.url))
						: isUrlActive(item.url);

				if (!("items" in item)) {
					return (
						<SidebarMenuItem key={item.title} >
							<SidebarMenuButton
								isActive={isActive}
								tooltip={item.title}
								render={<Link to={item.url} />}
							>
								{item.icon}
								<span>{item.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				}

					return (
						<Collapsible
							key={item.title}
							defaultOpen={item.isActive ?? isActive}
							className="group/collapsible"
							render={<SidebarMenuItem />}
						>
							<CollapsibleTrigger
								render={<SidebarMenuButton tooltip={item.title} />}
							>
								{item.icon}
								<span>{item.title}</span>
								<ChevronLeftIcon className="text-neutral-500 ms-auto transition-transform duration-200 group-data-open/collapsible:-rotate-90" />
							</CollapsibleTrigger>
							<CollapsibleContent>
								<SidebarMenuSub>
								{item.items.map((subItem) =>
									"url" in subItem ? (
										<SidebarMenuSubItem key={subItem.title}>
											<SidebarMenuSubButton
												isActive={isUrlActive(subItem.url)}
												render={<Link to={subItem.url} />}
											>
												{subItem.icon}
												<span>{subItem.title}</span>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									) : null,
								)}
								</SidebarMenuSub>
							</CollapsibleContent>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
