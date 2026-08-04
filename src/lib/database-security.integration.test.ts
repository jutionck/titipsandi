import { expect, it } from "vitest";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? it : it.skip;

databaseTest("enables RLS on every table in the exposed public schema", async () => {
  const { prisma } = await import("@/lib/prisma");
  const tablesWithoutRls = await prisma.$queryRaw<Array<{ tableName: string }>>`
    SELECT c.relname AS "tableName"
    FROM pg_catalog.pg_class AS c
    INNER JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  `;

  expect(tablesWithoutRls).toEqual([]);
});

databaseTest("does not grant public tables to Supabase API roles", async () => {
  const { prisma } = await import("@/lib/prisma");
  const apiRoleGrants = await prisma.$queryRaw<
    Array<{ grantee: string; tableName: string; privilege: string }>
  >`
    SELECT
      grantee,
      table_name AS "tableName",
      privilege_type AS privilege
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
    ORDER BY grantee, table_name, privilege_type
  `;

  expect(apiRoleGrants).toEqual([]);
});
