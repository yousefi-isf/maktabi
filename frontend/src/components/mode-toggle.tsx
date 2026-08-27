import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon" aria-label="Toggle theme" />
				}
			>
				<Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
				<Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" >
				<DropdownMenuItem className="text-xs" onClick={() => setTheme("light")}>
					روشن
				</DropdownMenuItem>
				<DropdownMenuItem className="text-xs" onClick={() => setTheme("dark")}>
					تیره
				</DropdownMenuItem>
				<DropdownMenuItem className="text-xs" onClick={() => setTheme("system")}>
					سیستم
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
