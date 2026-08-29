import { useDebounce } from "@uidotdev/usehooks"
import { SearchIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface DataTableSearchProps {
    value?: string
    onChange?: (value: string) => void
    placeholder?: string
    debounceMs?: number
    className?: string
}

export function DataTableSearch({
    value: externalValue = "",
    onChange,
    placeholder = "جستجو...",
    debounceMs = 300,
    className,
}: DataTableSearchProps) {
    const [inputValue, setInputValue] = useState(externalValue)
    const debouncedValue = useDebounce(inputValue, debounceMs)
    const isFirstRender = useRef(true)

    // Sync input if external value changes (e.g. browser back/forward or route change)
    useEffect(() => {
        setInputValue(externalValue)
    }, [externalValue])

    // Trigger onChange when debounced value changes
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        if (debouncedValue !== externalValue) {
            onChange?.(debouncedValue)
        }
    }, [debouncedValue, onChange, externalValue])

    const handleClear = () => {
        setInputValue("")
        onChange?.("")
    }

    return (
        <div className={cn("relative flex items-center max-w-sm w-full", className)}>
            <SearchIcon className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="pr-9 pl-8"
            />
            {inputValue ? (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute left-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                    aria-label="پاک کردن جستجو"
                >
                    <XIcon className="h-3.5 w-3.5" />
                </button>
            ) : null}
        </div>
    )
}

