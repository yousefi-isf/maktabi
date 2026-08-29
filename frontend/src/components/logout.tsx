import type { Button as ButtonPrimitive } from "@base-ui/react/button"
import { useRouter } from '@tanstack/react-router';
import type { VariantProps } from "class-variance-authority"
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import type { buttonVariants } from "./ui/button"
import { Button } from './ui/button';

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
type Props = ButtonProps
function Logout({ ...props }: Props) {
    const router = useRouter();
    return (
        <Button
            {...props}
            onClick={async () => {
                await authClient.signOut();
                router.invalidate();
            }}
            variant={"destructive"}>
            <LogOut />
        </Button>
    )
}

export default Logout