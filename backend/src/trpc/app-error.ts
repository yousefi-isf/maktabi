import type { TRPC_ERROR_CODE_KEY } from "@trpc/server";
import { TRPCError } from "@trpc/server";

const APP_ERROR_MESSAGES = {
	AUTHENTICATION_REQUIRED: "Authentication is required",
	SUPER_ADMIN_REQUIRED: "Super admin privileges are required",
	ACTIVE_SCHOOL_NOT_SELECTED: "No active school is selected",
	ACTIVE_SCHOOL_MEMBERSHIP_INVALID: "The active school membership is not valid",
	MISSING_PERMISSION: "The required permission is missing",
	INVALID_ROLE: "The selected role is invalid",
	ROLE_NAME_EXISTS: "A role with this name already exists",
	PERMISSION_CODE_EXISTS: "A permission with this code already exists",
	SCHOOL_NAME_EXISTS: "مدرسه ای با این نام از قبل موجود است",
	SCHOOL_NOT_FOUND: "The selected school does not exist",
	SCHOOL_ADDRESS_EXISTS: "A school with this address already exists",
	SCHOOL_PHONE_EXISTS: "A school with this phone number already exists",
	SCHOOL_IN_USE: "The school cannot be deleted because it has related records",
	INVALID_ROLE_PERMISSIONS:
		"One or more selected permissions are invalid or cannot be granted",
	INVALID_ACADEMIC_YEAR: "The selected academic year is invalid",
	USER_IDENTITY_CONFLICT: "The email or national code belongs to another user",
	MATCHING_USER_DELETED: "The matching user has been deleted",
	INVITE_EXPIRATION_INVALID: "The invite expiration must be in the future",
	INVITE_NOT_FOUND: "The invite link is invalid or has expired",
	USER_NOT_FOUND_IN_ACTIVE_SCHOOL:
		"The user was not found in the active school",
	USER_ALREADY_HAS_CREDENTIALS: "The user already has login credentials",
	SCHOOL_MEMBERSHIP_REQUIRED:
		"An active membership in the selected school is required",
	SESSION_EXPIRED: "The current session no longer exists",
	ACADEMIC_YEAR_TITLE_EXISTS: "An academic year with this title already exists",
	ACADEMIC_YEAR_DATE_OVERLAP:
		"The academic year date range overlaps an existing academic year",
	ACADEMIC_YEAR_NOT_FOUND: "The academic year was not found",
	ACADEMIC_YEAR_IN_USE:
		"The academic year cannot be deleted because it has related records",
	// INVALID_EMAIL_OR_PASSWORD : "ایمیل یا رمز عبور نامعتبر است",
} as const;

export type AppErrorCode = keyof typeof APP_ERROR_MESSAGES;
export type AppErrorParams = Readonly<Record<string, string | number>>;

export class AppErrorCause extends Error {
	constructor(
		public readonly appCode: AppErrorCode,
		public readonly params: AppErrorParams | null = null,
		public readonly field: string | null = null,
	) {
		super(APP_ERROR_MESSAGES[appCode]);
		this.name = "AppErrorCause";
	}
}

type CreateAppErrorOptions = {
	code: TRPC_ERROR_CODE_KEY;
	appCode: AppErrorCode;
	params?: AppErrorParams;
	field?: string;
};

export function appError({
	code,
	appCode,
	params,
	field,
}: CreateAppErrorOptions): TRPCError {
	const cause = new AppErrorCause(appCode, params ,field ?? null);

	return new TRPCError({
		code,
		message: cause.message,
		cause,
	});
}
