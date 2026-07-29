import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const nodeEnv = process.env["NODE_ENV"] ?? "development";

loadEnv({
  path: [`.env.${nodeEnv}.local`, ".env.local", `.env.${nodeEnv}`, ".env"],
  quiet: true,
});

function getMigrationUrl() {
  if (process.env["MIGRATION_DATABASE_URL"]) {
    return process.env["MIGRATION_DATABASE_URL"];
  }

  const runtimeUrl = process.env["DATABASE_URL"];
  if (runtimeUrl) {
    const url = new URL(runtimeUrl);

    // Supabase transaction pooler (:6543) is appropriate for the app runtime,
    // while Prisma migrations need a session connection. The same pooler on
    // :5432 provides an IPv4-compatible session endpoint.
    if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
      url.port = "5432";
      return url.toString();
    }
  }

  return process.env["DIRECT_URL"] ?? runtimeUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getMigrationUrl(),
  },
});
