import { Trash2Icon } from "lucide-react"
import type { ReactNode } from "react"
import ConfirmAlertDialog from "@/components/confirm-alert-dialog"
import { Button } from "@/components/ui/button"

export interface BulkDeleteButtonProps {
    disabled?: boolean
    onConfirm: () => Promise<void> | void
    title?: ReactNode
    description?: ReactNode
    label?: string
    confirmLabel?: string
}

export function BulkDeleteButton({
    disabled = false,
    onConfirm,
    title = "حذف موارد انتخاب‌شده؟",
    description = "این عملیات برای همیشه موارد انتخاب‌شده را حذف می‌کند و قابل بازگشت نیست.",
    label = "حذف",
    confirmLabel = "حذف",
}: BulkDeleteButtonProps) {
    return (
        <ConfirmAlertDialog
            trigger={
                <Button variant="destructive" disabled={disabled}>
                    <Trash2Icon className="w-4 h-4 ml-1" />
                    {label}
                </Button>
            }
            title={title}
            description={description}
            media={<Trash2Icon />}
            mediaClassName="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"
            onConfirm={onConfirm}
            disabled={disabled}
            confirmLabel={confirmLabel}
        />
    )
}

