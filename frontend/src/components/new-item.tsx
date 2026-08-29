
import { type ComponentProps, type PropsWithChildren, useState, useSyncExternalStore } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

type Props = {
    onSubmit?: () => Promise<void>
}

function NewItem({ children, onSubmit }: PropsWithChildren<Props>) {
    const [open, setOpen] = useState(false)

    const handleSubmit = async () => {
        try {
            await onSubmit?.()
            setOpen(false)
        } catch {
            // dialog is open ....  
        }
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button>جدید</Button>} />
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>
                        مدرسه <span className="text-sm text-muted-foreground">(جدید)</span>
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleSubmit()
                    }}
                >
                    {children}
                    <DialogFooter>
                        <Button className="w-1/2" type="submit">ایجاد</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default NewItem