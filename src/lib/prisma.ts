import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.startsWith("postgres")) {
    throw new Error("DATABASE_URL wajib berupa connection string PostgreSQL.");
  }

  const databaseHost = new URL(connectionString).hostname;
  const isSupabaseHost =
    databaseHost.endsWith(".supabase.com") || databaseHost.endsWith(".supabase.co");

  if (process.env.NODE_ENV === "development" && isSupabaseHost) {
    throw new Error(
      "Development tidak boleh menggunakan database Supabase. Gunakan PostgreSQL lokal melalui .env.development.local.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
