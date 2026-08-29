
import { useCallback, useState } from "react"

type Updater<T> = T | ((prev: T) => T)

export function useControllableState<T>({
    value,
    defaultValue,
    onChange,
}: {
    value?: T
    defaultValue: T
    onChange?: (value: T) => void
}) {
    const [internalValue, setInternalValue] = useState<T>(defaultValue)
    const isControlled = value !== undefined
    const currentValue = isControlled ? (value as T) : internalValue

    const setValue = useCallback((updater: Updater<T>) => {
        const next = typeof updater === "function"
            ? (updater as (prev: T) => T)(currentValue)
            : updater

        if (!isControlled) {
            setInternalValue(next)
        }
        onChange?.(next)
    }, [isControlled, currentValue, onChange])

    return [currentValue, setValue] as const
}