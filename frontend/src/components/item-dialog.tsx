import { type PropsWithChildren, type ReactElement, type ReactNode } from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";

type Props = {
    title: ReactNode;
    trigger?: ReactElement;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    isLoading?: boolean;
    footer?: ReactNode;
};

function ItemDialog({
    children,
    title,
    trigger,
    open: openProp,
    onOpenChange: onOpenChangeProp,
    isLoading,
    footer,
}: PropsWithChildren<Props>) {
    const [open, setOpen] = useControllableState({
        value: openProp,
        defaultValue: false,
        onChange: onOpenChangeProp,
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger render={trigger} />}
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        در حال بارگذاری...
                    </div>
                ) : (
                    children
                )}
                {footer ? <DialogFooter>{footer}</DialogFooter> : null}
            </DialogContent>
        </Dialog>
    );
}

export default ItemDialog;