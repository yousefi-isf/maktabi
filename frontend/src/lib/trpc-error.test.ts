import assert from "node:assert/strict";
import test from "node:test";
import { appError, type AppErrorCode } from "../../../backend/src/trpc/app-error.js";
import { getTRPCErrorMessage } from "./trpc-error.js";

test("resource error codes have backend and localized frontend messages", () => {
  const codes: AppErrorCode[] = ["CLASS_NOT_FOUND", "CLASS_IN_USE", "SUBJECT_NOT_FOUND", "SUBJECT_IN_USE", "STUDENT_NOT_FOUND_IN_ACTIVE_SCHOOL", "GRADE_LEVEL_NOT_FOUND", "GRADE_LEVEL_IN_USE", "GRADE_LEVEL_TITLE_EXISTS"];
  for (const appCode of codes) {
    const error = appError({ code: "BAD_REQUEST", appCode });
    assert.ok(error.message.length > 0);
    assert.match(getTRPCErrorMessage({ message: error.message, data: { appCode } }), /[آ-ی]/);
  }
});

test("unknown server error codes preserve the server message during version skew", () => {
  assert.equal(getTRPCErrorMessage({ message: "پیام خطا", data: { appCode: "FUTURE_CODE" as AppErrorCode } }), "پیام خطا");
});
