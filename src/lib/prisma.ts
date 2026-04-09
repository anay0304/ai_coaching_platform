import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// In development, Next.js hot-reloads modules on every file save.
// Without this guard, each reload would create a new PrismaClient (and a new
// connection pool), quickly exhausting the database's connection limit.
// By attaching the instance to `globalThis`, it survives module reloads within
// the same Node.js process.
const globalForPrisma = globalThis as unknown as {
  pool: Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pool = globalForPrisma.pool ?? new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
