import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma ORM 7: the query engine is the `pg` driver itself now, so the
// adapter isn't optional — `new PrismaClient()` alone won't connect.
//
// SSL note: v7 uses node-postgres instead of the old Rust engine, so SSL
// certificate validation defaults changed too. If you hit
// `P1010: User was denied access on the database`, see the `ssl` option
// below (rejectUnauthorized: false) or configure NODE_EXTRA_CA_CERTS —
// don't just silence the error without understanding which one applies to
// your hosting setup.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  // ssl: { rejectUnauthorized: false }, // uncomment if your DB host needs it
});

export const prisma = new PrismaClient({ adapter });