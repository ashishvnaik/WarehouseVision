import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log(`[db] Connecting to host: ${dbUrl.hostname}`);
} catch {
  console.error('[db] DATABASE_URL is not a valid URL:', process.env.DATABASE_URL);
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
