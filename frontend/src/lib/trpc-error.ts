import type {
	AppErrorCode,
	AppErrorParams,
} from "../../../backend/src/trpc/app-error.js";

type ErrorMessageResolver = (params: AppErrorParams | null) => string;

const ERROR_MESSAGES = {
	AUTHENTICATION_REQUIRED: () =>
		"برای انجام این عملیات باید وارد حساب کاربری شوید.",
	ACTIVE_SCHOOL_NOT_SELECTED: () => "هیچ مدرسه فعالی انتخاب نشده است.",
	ACTIVE_SCHOOL_MEMBERSHIP_INVALID: () => "عضویت شما در مدرسه فعال معتبر نیست.",
	MISSING_PERMISSION: () => "مجوز لازم برای انجام این عملیات را ندارید.",
	// USER_SCHOOL_MISMATCH: () => "کاربر فقط در مدرسه فعال قابل ایجاد است.",
	INVALID_ROLE: () => "نقش انتخاب‌شده معتبر نیست.",
	ROLE_NAME_EXISTS: () => "نقشی با این نام از قبل وجود دارد.",
	PERMISSION_CODE_EXISTS: () => "مجوزی با این کد از قبل وجود دارد.",
	SCHOOL_NAME_EXISTS: () => "مدرسه‌ای با این نام از قبل وجود دارد.",
	SCHOOL_ADDRESS_EXISTS: () => "مدرسه‌ای با این نشانی از قبل وجود دارد.",
	SCHOOL_PHONE_EXISTS: () => "مدرسه‌ای با این شماره تماس از قبل وجود دارد.",
	INVALID_ROLE_PERMISSIONS: () =>
		"یک یا چند مجوز انتخاب‌شده نامعتبر است یا قابل اعطا نیست.",
	INVALID_ACADEMIC_YEAR: () => "سال تحصیلی انتخاب‌شده معتبر نیست.",
	USER_IDENTITY_CONFLICT: () =>
		"ایمیل یا کد ملی واردشده متعلق به کاربر دیگری است.",
	MATCHING_USER_DELETED: () => "کاربر مطابق با اطلاعات واردشده حذف شده است.",
	INVITE_EXPIRATION_INVALID: () => "زمان انقضای دعوت‌نامه باید در آینده باشد.",
	USER_NOT_FOUND_IN_ACTIVE_SCHOOL: () => "کاربر در مدرسه فعال پیدا نشد.",
	USER_ALREADY_HAS_CREDENTIALS: () =>
		"این کاربر قبلاً اطلاعات ورود دریافت کرده است.",
	SCHOOL_MEMBERSHIP_REQUIRED: () => "عضویت فعال در مدرسه انتخاب‌شده الزامی است.",
	SESSION_EXPIRED: () => "نشست فعلی منقضی شده است. دوباره وارد شوید.",
	ACADEMIC_YEAR_TITLE_EXISTS: (params) =>
		`سال تحصیلی با عنوان «${readParam(params, "title")}» قبلاً ایجاد شده است.`,
	ACADEMIC_YEAR_DATE_OVERLAP: (params) =>
		`بازه انتخاب‌شده با سال تحصیلی «${readParam(params, "title")}» تداخل دارد.`,
	ACADEMIC_YEAR_NOT_FOUND: () => "سال تحصیلی مورد نظر پیدا نشد.",
	ACADEMIC_YEAR_IN_USE: () =>
		"این سال تحصیلی به دلیل وجود رکوردهای وابسته قابل حذف نیست.",
	INVITE_NOT_FOUND: () =>"% ساخت رمز منقضی یا نامعتبر است",
	SCHOOL_IN_USE: () => "مدرسه در حال استفاده است ...",
	SCHOOL_NOT_FOUND: () => "مدرسه ای یافت نشد",
	SUPER_ADMIN_REQUIRED: () => "نیاز به سطح دسترسی مدیر کل است"
} satisfies Record<AppErrorCode, ErrorMessageResolver>;

export type LocalizableTRPCError = {
	message: string;
	data?: {
		appCode?: AppErrorCode | null;
		params?: AppErrorParams | null;
		zodError?: {
			formErrors: string[];
			fieldErrors: Record<string, string[] | undefined>;
		} | null;
	} | null;
};

function readParam(params: AppErrorParams | null, key: string): string {
	return String(params?.[key] ?? "");
}

export function getTRPCErrorMessage(error: LocalizableTRPCError): string {
	const appCode = error.data?.appCode;
	if (!appCode) {
		return error.message;
	}

	return ERROR_MESSAGES[appCode](error.data?.params ?? null);
}

export function getTRPCFieldErrors(
	error: LocalizableTRPCError,
): Record<string, string[] | undefined> {
	return error.data?.zodError?.fieldErrors ?? {};
}
