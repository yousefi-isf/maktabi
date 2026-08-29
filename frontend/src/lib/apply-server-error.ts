// // lib/apply-server-error.ts
import type { AnyFormApi } from "@tanstack/react-form";
import type { TRPCClientErrorLike } from "@trpc/client";
import { showErrorToast } from "./show-error-toast";

type ZodErrorShape = {
	formErrors: string[];
	fieldErrors: Record<string, string[]>;
};

// export function applyServerErrors(
// 	form: AnyFormApi,
// 	error: TRPCClientErrorLike<any>,
// ) {
// 	const zodError = error.data?.zodError as ZodErrorShape | null | undefined;
// 	const fieldErrors = zodError?.fieldErrors;

// 	if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
// 		// showErrorToast(error.message);
// 		return;
// 	}

// 	let appliedAny = false;

// 	for (const [field, messages] of Object.entries(fieldErrors)) {
// 		if (!messages?.[0]) continue;

// 		// اگه فیلدی با این اسم توی فرم رجیستر نشده باشه، meta وجود نداره
// 		const fieldApi = form.getFieldMeta(field as never);
// 		if (!fieldApi) {
// 			continue; // یا console.warn(`فیلد "${field}" توی فرم پیدا نشد`);
// 		}

// 		form.setFieldMeta(field as never, (prev) => {
// 			if (!prev) return prev; // 👈 گارد اصلی — از کرش جلوگیری می‌کنه
// 			return {
// 				...prev,
// 				errorMap: { ...prev.errorMap, onServer: messages[0] },
// 			};
// 		});

// 		appliedAny = true;
// 	}

// 	// اگه هیچ فیلدی مچ نشد (مثلاً اسم فیلد سرور با فرم فرق داره)، حداقل toast بزن
// 	if (!appliedAny) {
// 		showErrorToast(error.message);
// 	}
// }

export function applyServerErrors(
	form: AnyFormApi,
	error: TRPCClientErrorLike<any>,
) {
	const zodError = error.data?.zodError as ZodErrorShape | null | undefined;
	const fieldErrors = zodError?.fieldErrors;

	if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
		// showErrorToast(error.message);
		return;
	}

	let appliedAny = false;

	for (const [field, messages] of Object.entries(fieldErrors)) {
		if (!messages?.[0]) continue;

		const fieldApi = form.getFieldMeta(field as never);
		if (!fieldApi) continue;

		form.setFieldMeta(field as never, (prev) => {
			if (!prev) return prev;
			return {
				...prev,
				errorMap: {
					...prev.errorMap,
					onServer: { message: messages[0] },
				},
			};
		});

		appliedAny = true;
	}

	if (!appliedAny) {
		// showErrorToast(error.message);
	}
}
