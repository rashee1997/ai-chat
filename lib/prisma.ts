import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 7's client generator ("prisma-client") no longer reads the
// datasource URL out of the schema/prisma.config.ts at runtime — it needs
// an explicit driver adapter. @prisma/adapter-pg speaks the standard
// Postgres wire protocol over `pg`, so this works with any Postgres-
// compatible connection string (local Postgres, Prisma Postgres's "Direct
// connection" string, Neon, Supabase, RDS, ...). If you're using Prisma
// Postgres's Accelerate-pooled connection string instead (the
// "prisma+postgres://" scheme), swap this for @prisma/extension-accelerate
// — that URL scheme isn't a raw Postgres connection this adapter can dial.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres instance."
  );
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard Next.js singleton: dev's hot-reload re-executes this module on
// every edit, which would otherwise open a fresh Postgres connection pool
// each time and eventually exhaust the database's connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
