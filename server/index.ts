import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { pool } from "./db";

import { setupVite, serveStatic, log } from "./vite";

declare module "express-session" {
  interface SessionData {
    role: "operator" | "supervisor" | "programmer" | "superuser";
    testingMode: boolean;
  }
}

const app = express();

// Surface missing configuration in the deploy logs instead of failing silently at login.
for (const key of ["ROLE_OPERATOR_PASSWORD", "ROLE_SUPERVISOR_PASSWORD", "ROLE_PROGRAMMER_PASSWORD", "ROLE_SUPERUSER_PASSWORD", "SESSION_SECRET"]) {
  if (!process.env[key]?.trim()) console.warn(`[config] ${key} is not set`);
}

// Trust Railway's (and similar) reverse proxy so req.secure reflects HTTPS
// and secure session cookies are actually set on the client.
app.set('trust proxy', 1);

// Session middleware — stored in PostgreSQL so sessions survive server restarts
const PgSession = connectPgSimple(session);
app.use(session({
  secret: process.env.SESSION_SECRET || "wv-dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "sessions",
    // Created at startup by ensureSessionsTable(): connect-pg-simple's lazy creation
    // caches its first failure, which would break every login until a restart.
    createTableIfMissing: false,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: "strict",
  },
}));


declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function ensureSessionsTable() {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire")`);
      return;
    } catch (err) {
      if (attempt >= 5) throw err;
      console.warn(`[db] Could not ensure sessions table (attempt ${attempt}/5), retrying:`, err instanceof Error ? err.message : err);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

(async () => {
  await ensureSessionsTable();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
