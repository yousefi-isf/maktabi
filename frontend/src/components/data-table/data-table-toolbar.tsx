import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DataTableToolbarProps {
    children: ReactNode
    className?: string
}

export function DataTableToolbar({ children, className }: DataTableToolbarProps) {
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
            {children}
        </div>
    )
}

