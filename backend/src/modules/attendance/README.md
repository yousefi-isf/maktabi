# Classroom attendance

Device punches are preliminary evidence only. They never create a final
`Attendance` record. A teacher or administrator confirms the daily roster from
**حضور و غیاب → تثبیت حضور کلاس**.

- Teachers see classes where they are the homeroom teacher or have an active
  teaching assignment. Administrators with `enrollment.teacher.assign` can
  manage the school's classes and responsible teachers.
- `attendance.record.create` permits confirmation; `attendance.record.update`
  permits changes. Without a device punch that day, present/late requires a
  note and stores `manualOverride`. Excused absence also requires a note.
- Confirmation stores the actor, time, first device punch, note and an audit
  history. The per-class daily unique key and transaction lock prevent duplicate saves.
- Day boundaries use Asia/Tehran (UTC+03:30).

Administrators can add teachers and generate invitation links from the teacher
management section. Creation requires user creation, role assignment, teacher
assignment and attendance write permissions. The created school role grants
only attendance creation/update; it grants no school-wide dashboard access.
Invitation links use the existing password-setup flow. No invitation is sent
automatically.

School-wide device endpoints require `attendance.record.read`. Student
`attendance.record.read.own` grants no access to those endpoints. The dashboard
requires both attendance read and school-wide score read. Students land on
their account page; teachers with attendance write permissions land on their
class roster.

Apply the schema on other environments with:

```sh
pnpm --dir backend/packages/db exec prisma migrate deploy
pnpm --dir backend/packages/db exec prisma generate
```

Regression checks (no live database connection):

```sh
node --import tsx backend/src/modules/attendance/classroom.test.ts
node --conditions=development --import tsx backend/src/modules/attendance/router-access.test.ts
```
