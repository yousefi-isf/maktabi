import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
const { academicYearsRouter } = await import("../modules/academic-years/router.js");
const { studentsRouter } = await import("../modules/students/router.js");
const { listInput } = await import("../lib/pagination.js");

// Exercise the actual API schemas without connecting a database.
const createYear = academicYearsRouter._def.procedures.create._def.inputs[0] as z.ZodType;
const updateYear = academicYearsRouter._def.procedures.update._def.inputs[0] as z.ZodType;
const createStudent = studentsRouter._def.procedures.create._def.inputs[0] as z.ZodType;
const year = { title: "1405-1406", startDate: new Date("2026-09-23"), endDate: new Date("2027-06-21") };

function message(schema: z.ZodType, input: unknown, field: string) {
  const result = schema.safeParse(input);
  assert.equal(result.success, false);
  if (result.success) throw new Error("Expected invalid input");
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

test("missing and invalid values retain distinct Persian validation messages", () => {
  assert.equal(message(createYear, {}, "title"), "عنوان الزامی است");
  assert.equal(message(createYear, { ...year, title: 123 }, "title"), "عنوان نامعتبر است");
  assert.equal(message(createYear, { ...year, startDate: undefined }, "startDate"), "تاریخ شروع الزامی است");
  assert.equal(message(createYear, { ...year, startDate: "2026-09-23" }, "startDate"), "تاریخ شروع نامعتبر است");
  assert.equal(message(createStudent, {}, "fullName"), "نام و نام خانوادگی الزامی است");
  assert.equal(message(createStudent, { fullName: 123 }, "fullName"), "نام نامعتبر است");
});

test("create and update both reject reversed academic-year dates", () => {
  for (const schema of [createYear, updateYear]) {
    const input = { ...year, id: "00000000-0000-4000-8000-000000000001" };
    assert.equal(schema.safeParse(input).success, true);
    assert.equal(message(schema, { ...input, endDate: input.startDate }, "endDate"), "تاریخ پایان باید پس از تاریخ شروع باشد");
  }
});

test("pagination defaults and numeric limits remain enforced", () => {
  assert.deepEqual(listInput.parse({}), { page: 1, limit: 20 });
  assert.equal(message(listInput, { page: "2" }, "page"), "شماره صفحه نامعتبر است");
  for (const input of [{ page: 0 }, { page: 1.5 }, { limit: 101 }]) assert.equal(listInput.safeParse(input).success, false);
});
