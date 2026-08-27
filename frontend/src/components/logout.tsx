import { useRouter } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button, type ButtonProps } from './ui/button';

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