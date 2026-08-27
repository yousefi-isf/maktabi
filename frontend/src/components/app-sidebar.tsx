import type { ComponentProps } from "react";
import { NavMain } from "@/components/nav-main";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { navigationItems } from "@/lib/navigation";
import { type AuthMe, filterNavigation } from "@/lib/permissions";
import Logout from "./logout";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { SchoolSwitcher } from "./school-switcher";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
	me: AuthMe;
};

export function AppSidebar({ me, ...props }: AppSidebarProps) {
	const visibleNavigation = filterNavigation(navigationItems, me.permissions);
	console.log(me)
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu >
					<SidebarMenuItem className="flex h-12 min-w-0 items-center gap-3 rounded-lg px-2 text-start transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
						<Avatar className="shrink-0">
							<AvatarImage
								src="https://github.com/shadcn.png"
								alt="@shadcn"
							/>
							<AvatarFallback>CN</AvatarFallback>
						</Avatar>
						<div className="grid min-w-0 max-w-52 flex-1 overflow-hidden whitespace-nowrap text-start text-sm leading-tight opacity-100 transition-[max-width,opacity] duration-200 ease-linear group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
							<span className="truncate font-medium">{me.user.name}</span>
							<span className="truncate text-xs text-muted-foreground">{me.user.email}</span>
						</div>
					</SidebarMenuItem>
					{/* <SidebarMenuItem className="flex h-12 min-w-0 items-center gap-3 rounded-lg px-2 text-start transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"> */}
					<SchoolSwitcher me={me} />
					{/* </SidebarMenuItem> */}
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={visibleNavigation} />

			</SidebarContent>
			<SidebarFooter>
				<Logout />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
