import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useAppForm } from "@/components/form/form-context";
import ItemDialog from "@/components/item-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { applyServerErrors } from "@/lib/apply-server-error";
import { showSuccessToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import { getTRPCFieldErrors } from "@/lib/trpc-error";
import { schoolFormOpts } from "./form-opts";
import { SchoolFields } from "./school-fields";

interface CreateSchoolDialogProps {
    trigger?: React.ReactElement;
}

export function CreateSchoolDialog({ trigger }: CreateSchoolDialogProps) {
    const [open, setOpen] = useState(false);
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createSchool = useMutation(
        trpc.schools.create.mutationOptions({
            onError: (error) => {
                getTRPCFieldErrors(error);
                applyServerErrors(form, error);
            },
            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: trpc.schools.list.queryKey(),
                });
                showSuccessToast("مدرسه با موفقیت ساخته شد");
                form.reset();
                setOpen(false);
            },
        })
    );

    const form = useAppForm({
        ...schoolFormOpts,
        async onSubmit({ value }) {
            await createSchool.mutateAsync(value);
        },
    });

    return (
        <ItemDialog
            open={open}
            onOpenChange={setOpen}
            trigger={trigger ?? <Button><PlusIcon className="w-4 h-4 ml-1" />جدید</Button>}
            title={<>مدرسه <span className="text-sm text-muted-foreground">(جدید)</span></>}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <form.AppForm>
                    <SchoolFields
                        form={form}
                        fields={{
                            city: "city",
                            district: "district",
                            name: "name",
                            province: "province",
                            schoolType: "schoolType",
                            address: "address",
                            phone: "phone",
                        }}
                    />
                    <DialogFooter className="mt-4">
                        <form.SubmitField submittingLabel="در حال ایجاد...">
                            ایجاد
                        </form.SubmitField>
                    </DialogFooter>
                </form.AppForm>
            </form>
        </ItemDialog>
    );
}

