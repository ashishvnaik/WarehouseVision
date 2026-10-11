import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  // "sessions" is owned by connect-pg-simple, not Drizzle; never diff or drop it.
  tablesFilter: ["!sessions"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
