import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PenIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { showInfoToast } from "@/lib/show-error-toast";
import { useTRPC } from "@/lib/trpc";
import type { School } from "./types";

interface SchoolRowActionsProps {
    school: School;
}

export function SchoolRowActions({ school }: SchoolRowActionsProps) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const deleteSchool = useMutation(trpc.schools.delete.mutationOptions());

    async function handleClickRemove() {
        await deleteSchool.mutateAsync({ id: school.id }, {
            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: trpc.schools.list.queryKey(),
                });
                showInfoToast("1 مدرسه با موفقیت حذف شد");
            },
        });
    }

    return (
        <ButtonGroup>
            <Button
                variant="outline"
                size="icon"
                render={
                    <Link to="/schools/$schoolId" params={{ schoolId: school.id }}>
                        <PenIcon />
                    </Link>
                }
            />
            <Button
                variant="destructive"
                size="icon"
                onClick={handleClickRemove}
                disabled={deleteSchool.isPending}
            >
                <Trash2 />
            </Button>
        </ButtonGroup>
    );
}

