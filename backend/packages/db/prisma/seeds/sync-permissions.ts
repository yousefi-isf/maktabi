
import { prisma } from "@maktabi/db";
import { ALL_PERMISSIONS } from "../../../../src/config/permissions";

const PERMISSIONS_LOCK_KEY = 72736123;

export async function syncPermissions() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PERMISSIONS_LOCK_KEY})`;

    const existing = await tx.permission.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map((p) => p.code));

    const toCreate = ALL_PERMISSIONS.filter((code) => !existingCodes.has(code));

    if (toCreate.length > 0) {
      await tx.permission.createMany({
        data: toCreate.map((code) => ({ code })),
        skipDuplicates: true,
      });
    }

    const definedCodes = new Set(ALL_PERMISSIONS);
    const stale = [...existingCodes].filter((c) => !definedCodes.has(c as any));
    if (stale.length > 0) {
      console.warn(`[permissions] in DB but no longer in code: ${stale.join(", ")}`);
    }
  });

  console.log(`[permissions] synced — ${ALL_PERMISSIONS.length} defined`);
}