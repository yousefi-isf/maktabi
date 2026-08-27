const AUTH_ERROR_MESSAGES = {
	INVALID_EMAIL_OR_PASSWORD: () => "ایمیل یا رمز عبور نامعتبر است.",
	INVALID_EMAIL: () => "ایمیل واردشده معتبر نیست.",
	INVALID_PASSWORD: () => "رمز عبور نامعتبر است.",
	USER_NOT_FOUND: () => "کاربر پیدا نشد.",
	USER_EMAIL_NOT_FOUND: () => "کاربری با این ایمیل پیدا نشد.",
	CREDENTIAL_ACCOUNT_NOT_FOUND: () =>
		"برای این حساب کاربری رمز عبوری ثبت نشده است.",
	PASSWORD_TOO_SHORT: () => "رمز عبور بیش از حد کوتاه است.",
	PASSWORD_TOO_LONG: () => "رمز عبور بیش از حد بلند است.",
	USER_ALREADY_EXISTS: () => "کاربری با این مشخصات از قبل وجود دارد.",
	EMAIL_NOT_VERIFIED: () => "ایمیل شما تأیید نشده است.",
	EMAIL_ALREADY_VERIFIED: () => "ایمیل شما از قبل تأیید شده است.",
	SESSION_EXPIRED: () => "نشست شما منقضی شده است. دوباره وارد شوید.",
	SESSION_NOT_FRESH: () =>
		"برای انجام این عملیات باید به‌تازگی وارد شده باشید.",
	FAILED_TO_CREATE_SESSION: () =>
		"ایجاد نشست با خطا مواجه شد. دوباره تلاش کنید.",
	FAILED_TO_GET_SESSION: () => "دریافت اطلاعات نشست با خطا مواجه شد.",
	FAILED_TO_CREATE_USER: () => "ایجاد کاربر با خطا مواجه شد.",
	FAILED_TO_UPDATE_USER: () =>
		"به‌روزرسانی اطلاعات کاربر با خطا مواجه شد.",
	INVALID_TOKEN: () => "توکن واردشده معتبر نیست.",
	TOKEN_EXPIRED: () => "مدت اعتبار توکن به پایان رسیده است.",
	VALIDATION_ERROR: () => "اطلاعات ارسالی معتبر نیست.",
	INVALID_ORIGIN: () => "درخواست از مبدا غیرمجاز ارسال شده است.",
	MISSING_OR_NULL_ORIGIN: () => "مبدا درخواست ارسال‌شده معتبر نیست.",
};

type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

type LocalizableAuthError = {
	code?: string | null;
	message?: string | null;
};

export function getAuthErrorMessage(error: LocalizableAuthError): string {
	const code = error.code;
	if (code && code in AUTH_ERROR_MESSAGES) {
		return AUTH_ERROR_MESSAGES[code as AuthErrorCode]();
	}

	return error.message || "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.";
}
