import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let dbHost = '';
try {
  dbHost = new URL(process.env.DATABASE_URL).hostname;
  console.log(`[db] Connecting to host: ${dbHost}`);
} catch {
  console.error('[db] DATABASE_URL is not a valid URL:', process.env.DATABASE_URL);
}

// Neon's serverless driver speaks WebSockets and only works against Neon.
// Use node-postgres for any other Postgres (local dev, Railway, etc.).
const isNeon = dbHost.endsWith('.neon.tech');

export const pool = isNeon
  ? new NeonPool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const db = isNeon
  ? drizzleNeon({ client: pool as NeonPool, schema })
  : drizzlePg({ client: pool as pg.Pool, schema });
