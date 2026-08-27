import { toast } from "@/components/ui/toast";
import { getAuthErrorMessage } from "./auth-error";
import {
	getTRPCErrorMessage,
	type LocalizableTRPCError,
} from "./trpc-error";

export interface AuthClientError {
	code?: string | null;
	message?: string | null;
	statusText?: string | null;
}

function addToast(type: "error" | "success", message: string) {
	if (typeof window === "undefined") return;
	toast.add({ type, description: message });
}

export function showErrorToast(message: string) {
	addToast("error", message);
}

export function showSuccessToast(message: string) {
	addToast("success", message);
}

export function showTRPCErrorToast(error: unknown) {
	showErrorToast(
		getTRPCErrorMessage(error as LocalizableTRPCError),
	);
}

export function showAuthErrorToast(error: AuthClientError) {
	showErrorToast(getAuthErrorMessage(error));
}
