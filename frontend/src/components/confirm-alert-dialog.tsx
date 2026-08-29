import { Loader2Icon } from "lucide-react";
import * as React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Button } from "@/components/ui/button";

export interface ConfirmAlertDialogProps {
    trigger?: React.ReactElement;
    title: React.ReactNode;
    description?: React.ReactNode;
    media?: React.ReactNode;
    mediaClassName?: string;
    confirmLabel?: React.ReactNode;
    cancelLabel?: React.ReactNode;
    confirmVariant?: React.ComponentProps<typeof Button>["variant"];
    cancelVariant?: React.ComponentProps<typeof Button>["variant"];
    onConfirm?: () => Promise<void> | void;
    onCancel?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    size?: "default" | "sm";
    children?: React.ReactNode;
    contentClassName?: string;
}

export function ConfirmAlertDialog({
    trigger,
    title,
    description,
    media,
    mediaClassName,
    confirmLabel = "تایید",
    cancelLabel = "انصراف",
    confirmVariant = "destructive",
    cancelVariant = "outline",
    onConfirm,
    onCancel,
    isLoading,
    disabled = false,
    open: openProp,
    onOpenChange,
    size = "default",
    children,
    contentClassName,
}: ConfirmAlertDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : uncontrolledOpen;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    };

    const loading = Boolean(isLoading || isSubmitting);

    const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!onConfirm) {
            handleOpenChange(false);
            return;
        }

        try {
            setIsSubmitting(true);
            await onConfirm();
            handleOpenChange(false);
        } catch (error) {
            // Keep open if an error is thrown
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        onCancel?.();
        handleOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <AlertDialogTrigger render={trigger} disabled={disabled} />}
            <AlertDialogContent size={size} className={contentClassName}>
                <AlertDialogHeader>
                    {media && (
                        <AlertDialogMedia className={mediaClassName}>
                            {media}
                        </AlertDialogMedia>
                    )}
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && (
                        <AlertDialogDescription>{description}</AlertDialogDescription>
                    )}
                </AlertDialogHeader>

                {children}

                <AlertDialogFooter>
                    <AlertDialogCancel
                        variant={cancelVariant}
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={confirmVariant}
                        onClick={handleConfirm}
                        disabled={loading || disabled}
                    >
                        {loading && <Loader2Icon className="size-4 animate-spin" />}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default ConfirmAlertDialog;

