import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

const databaseUrl = process.env.REPORT_CARD_TEST_DATABASE_URL;

test("report-card imports commit or roll back the entire batch", {
  skip: !databaseUrl && "Set REPORT_CARD_TEST_DATABASE_URL to run PostgreSQL integration tests",
  timeout: 120_000,
}, async (t) => {
  // Only this randomly named schema is migrated, written to, or dropped. The
  // adapter and admin connection both use it; no application tables are touched.
  const schema = `test_report_import_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: databaseUrl });
  await admin.connect();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }, { schema }) });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`SET search_path TO "${schema}"`);
    const migrations = new URL("../prisma/migrations/", import.meta.url);
    for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await admin.query(await readFile(new URL(`${entry.name}/migration.sql`, migrations), "utf8"));
    }
    // The application module also exports a default client; it is never queried
    // by this test. All importer operations must use the injected isolated db.
    process.env.DATABASE_URL ??= databaseUrl;
    const { importReportCards } = await import("../../../src/modules/importers/report-card/service.js");
    const { parseReportCardText } = await import("../../../src/modules/importers/report-card/text-parser.js");
    const batch = parseReportCardText(await readFile(new URL("../../../karname.txt", import.meta.url), "utf8"));
    const tables = (await admin.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename", [schema])).rows.map((row) => row.tablename);
    async function snapshot() {
      const result: Record<string, unknown[]> = {};
      for (const table of tables) {
        result[table] = (await admin.query(`SELECT to_jsonb(t) AS row FROM "${schema}"."${table}" t ORDER BY to_jsonb(t)::text`)).rows.map((entry) => entry.row);
      }
      return result;
    }
    const empty = await snapshot();

    await t.test("invalid input is rejected before opening a transaction", async () => {
      let transactions = 0;
      await assert.rejects(importReportCards({ ...batch, students: [] }, {
        prisma: { $transaction: () => { transactions++; throw new Error("Unexpected transaction"); } } as unknown as PrismaClient,
      }));
      assert.equal(transactions, 0);
    });

    await t.test("failure after a completed student rolls back school, students, scores and GPA bases", async () => {
      await admin.query(`CREATE FUNCTION fail_import() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.gpa_basis IS NOT NULL AND EXISTS (SELECT 1 FROM "${schema}".enrollment WHERE gpa_basis IS NOT NULL) THEN
            RAISE EXCEPTION 'injected_import_failure';
          END IF;
          RETURN NEW;
        END $$;
        CREATE TRIGGER fail_import BEFORE UPDATE ON enrollment FOR EACH ROW EXECUTE FUNCTION fail_import();`);
      try {
        await assert.rejects(importReportCards(batch, { prisma: db }), /injected_import_failure/);
        assert.deepEqual(await snapshot(), empty);
      } finally {
        await admin.query("DROP TRIGGER fail_import ON enrollment; DROP FUNCTION fail_import()");
      }
    });

    let schoolId = "";
    await t.test("a full class commits all scores and GPA bases; replay does not duplicate records", async () => {
      const start = performance.now();
      const first = await importReportCards(batch, { prisma: db });
      schoolId = first.schoolId;
      assert.equal(first.studentsCreated, batch.students.length);
      assert.equal(await db.student.count(), batch.students.length);
      assert.equal(await db.score.count(), first.scoresUpserted);
      const enrollments = await db.enrollment.findMany({ include: { student: true } });
      for (const card of batch.students) {
        const enrollment = enrollments.find((entry) => entry.student.studentNumber === card.student.studentNumber)!;
        assert.ok(enrollment.gpaBasis);
        assert.equal(Number(enrollment.gpa), card.summary.gpa);
        assert.equal(Number(enrollment.totalScoreSum), card.summary.totalScoreSum);
      }
      const before = await snapshot();
      const replay = await importReportCards(batch, { prisma: db, activeSchoolId: schoolId });
      assert.equal(replay.studentsCreated, 0);
      assert.equal(replay.studentsUpdated, batch.students.length);
      const after = await snapshot();
      for (const table of tables) assert.equal(after[table].length, before[table].length, table);
      t.diagnostic(`Full ${batch.students.length}-student import plus replay: ${Math.round(performance.now() - start)} ms`);
    });

    await t.test("failed reimport restores existing values and removes newly created students", async () => {
      const before = await snapshot();
      const changed = structuredClone(batch);
      changed.students = changed.students.slice(0, 2);
      changed.students[0].student.firstName = "تغییر آزمایشی";
      changed.students[0].summary.gpa = 1;
      changed.students[0].courses[0].title = "عنوان آزمایشی";
      changed.students[1].student.nationalCode = "9999999998";
      changed.students[1].student.studentNumber = "9999999998";
      await admin.query(`CREATE FUNCTION fail_import() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.gpa_basis IS NOT NULL AND EXISTS (SELECT 1 FROM "${schema}".student WHERE id = NEW.student_id AND student_number = '9999999998') THEN
            RAISE EXCEPTION 'injected_import_failure';
          END IF;
          RETURN NEW;
        END $$;
        CREATE TRIGGER fail_import BEFORE UPDATE ON enrollment FOR EACH ROW EXECUTE FUNCTION fail_import();`);
      try {
        await assert.rejects(importReportCards(changed, { prisma: db, activeSchoolId: schoolId }), /injected_import_failure/);
        assert.deepEqual(await snapshot(), before);
      } finally {
        await admin.query("DROP TRIGGER fail_import ON enrollment; DROP FUNCTION fail_import()");
      }
    });

    await t.test("simultaneous imports into the same school do not race or duplicate records", async () => {
      const before = await snapshot();
      const concurrentBatch = structuredClone(batch);
      concurrentBatch.students = concurrentBatch.students.slice(0, 1);
      concurrentBatch.students[0].student.nationalCode = "9999999997";
      concurrentBatch.students[0].student.studentNumber = "9999999997";
      const results = await Promise.all([1, 2].map(() => importReportCards(concurrentBatch, { prisma: db, activeSchoolId: schoolId })));
      assert.equal(results.reduce((sum, result) => sum + result.studentsCreated, 0), 1);
      const after = await snapshot();
      assert.equal(after.student.length, before.student.length + 1);
      assert.equal(after.enrollment.length, before.enrollment.length + 1);
      assert.equal(after.score.length, before.score.length + results[0].scoresUpserted);
    });
  } finally {
    await db.$disconnect();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});
