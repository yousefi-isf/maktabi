# Report-card import transaction

Both `importText` and `importBatch` call `importReportCards`. This public service
validates the DTO before opening a transaction, then commits the **entire batch**:
school/year/class setup, identities, enrollments, exams, scores and GPA bases.
An error at any stage rolls back both inserts and changes to existing records.
Success is returned only after commit. Parsing text and rendering the preview
happen outside the transaction.

The private writer accepts only `Prisma.TransactionClient`. All database helpers
must receive that client; using a global client would escape rollback. Exceptions
must propagate to the transaction owner. Do not open a nested transaction in a
helper or perform external network operations inside the transaction.

Imports targeting the same active school (or source school code during initial
setup) share a PostgreSQL transaction advisory lock. This serializes importer
find/create operations for that destination; it does not lock other application
workflows. The connection acquisition limit is 10 seconds and the transaction
lifetime, including advisory-lock wait, is 60 seconds. Timeouts fail the whole
batch. Database uniqueness constraints remain necessary for other concurrent
writers. Replaying a batch updates existing records; this is not a promise to
delete previously stored grades omitted by the new input.

## PostgreSQL regression tests

Set `REPORT_CARD_TEST_DATABASE_URL` to a PostgreSQL database where the test user
can create schemas, then run from the repository root:

```sh
pnpm --dir backend test:report-card-import
```

The test creates a randomly named schema, applies the repository's migrations
there, uses an explicitly scoped Prisma adapter, and drops only that schema in
cleanup. Without the environment variable the integration test is skipped.
It checks validation before transaction acquisition, rollback after an earlier
student has completed, successful full-class commit, replay, rollback of changes
to existing data, and simultaneous imports of the same new student. Database
triggers inject failures before saving the GPA basis; rollback assertions compare
all table contents, including timestamps and previously stored values.
