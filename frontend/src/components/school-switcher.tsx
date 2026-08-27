import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { AuthMe } from "@/lib/permissions";
import { useTRPC } from "@/lib/trpc";

const PLATFORM_WIDE = {
	id: "platform-wide",
	name: "کل مدارس",
	district: "کل سیستم",
} as const;

type School = NonNullable<AuthMe["currentSchool"]>;

export function SchoolSwitcher({ me }: { me: AuthMe }) {
	const trpc = useTRPC();
	const router = useRouter();
	const { isMobile } = useSidebar();

	const activeSchool: School | typeof PLATFORM_WIDE =
		me.currentSchool ?? PLATFORM_WIDE;

	const switchSchool = useMutation(
		trpc.auth.switchSchool.mutationOptions({
			onSuccess: () => router.invalidate(),
		}),
	);

	const clearSchoolContext = useMutation(
		trpc.auth.clearSchoolContext.mutationOptions({
			onSuccess: () => router.invalidate(),
		}),
	);

	const isPending = switchSchool.isPending || clearSchoolContext.isPending;

	return (
		<SidebarMenu className="pt-2">
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size="lg"
								disabled={isPending}
								className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
							/>
						}
					>
						<div className="grid flex-1 text-start text-sm leading-tight">
							<span className="truncate font-medium">
								{activeSchool.name}
							</span>
							<span className="truncate text-xs">
								{activeSchool.district}
							</span>
						</div>
						<ChevronsUpDownIcon className="ms-auto" />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-fit"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								مدارس فعال
							</DropdownMenuLabel>
							{me.schools.map((school) => (
								<DropdownMenuItem
									key={school.id}
									disabled={isPending}
									onClick={() => {
										if (school.id !== activeSchool.id) {
											switchSchool.mutate({
												schoolId: school.id,
											});
										}
									}}
									className="gap-2 p-2"
								>
									{school.name}
									{school.id === activeSchool.id && (
										<CheckIcon className="ms-auto size-4" />
									)}
								</DropdownMenuItem>
							))}
							{me.user.isSuperAdmin && (
								<DropdownMenuItem
									disabled={isPending}
									onClick={() => {
										if (activeSchool !== PLATFORM_WIDE) {
											clearSchoolContext.mutate();
										}
									}}
									className="gap-2 p-2"
								>
									{PLATFORM_WIDE.name}
									{activeSchool === PLATFORM_WIDE && (
										<CheckIcon className="ms-auto size-4" />
									)}
								</DropdownMenuItem>
							)}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
