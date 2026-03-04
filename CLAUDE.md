# CLAUDE.md — WarehouseVision

AI assistant guide for the **WarehouseVision** codebase: an AI-powered warehouse inventory management system that uses computer vision to automatically detect and count items from uploaded images.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Development Workflow](#development-workflow)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [API Reference](#api-reference)
8. [Frontend Architecture](#frontend-architecture)
9. [Backend Architecture](#backend-architecture)
10. [AI / Model System](#ai--model-system)
11. [Key Conventions](#key-conventions)
12. [Design System](#design-system)

---

## Project Overview

WarehouseVision lets warehouse operators upload images and have AI models (LLMs + CNNs) automatically detect inventory items, count them, and update a date-based inventory database. Key capabilities:

- **Multi-model AI vision**: 10+ models across OpenAI, Anthropic, Google Gemini, OpenRouter (Llama), and Roboflow (YOLO).
- **Prompt versioning**: Users can manage custom AI prompts and mark a default.
- **Few-shot learning**: Training examples are injected into prompts at analysis time.
- **Image caching**: SHA-256 hashing prevents re-analyzing the same image.
- **Date-based inventory tracking**: Item counts are stored per-date for trend analysis.
- **Alert management**: Automatic low-stock / out-of-stock alerts with dismissal.
- **Settings & configuration**: Confidence thresholds, image caching toggle, model selection.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18.3, TypeScript, Vite 5.4, Wouter (routing), TanStack Query 5.60, shadcn/ui, Radix UI, Tailwind CSS 3.4, Recharts, React Hook Form, date-fns |
| **Backend** | Node.js, Express 4.21, TypeScript (ES modules via tsx/esbuild) |
| **Database** | Drizzle ORM 0.39, Neon serverless PostgreSQL |
| **AI Providers** | OpenAI (GPT-5.2, GPT-4o), Anthropic (Claude Sonnet 4, Claude Opus 4.5), Google Gemini (2.5 Flash/Pro), OpenRouter (Llama 3.2 90B/11B), Roboflow (YOLOv8, YOLOv9) |
| **File uploads** | Multer (10 MB limit) |
| **Build** | Vite (client), esbuild (server) |
| **Dev runtime** | tsx (TypeScript runner) |

---

## Repository Structure

```
WarehouseVision/
├── client/                     # React frontend
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx            # Entry point (ReactDOM.createRoot)
│       ├── App.tsx             # Root: providers + routing layout
│       ├── index.css           # Global styles & CSS variables
│       ├── lib/
│       │   ├── queryClient.ts  # TanStack Query setup (staleTime: Infinity)
│       │   └── utils.ts        # cn() helper and utilities
│       ├── hooks/
│       │   ├── use-mobile.tsx  # Mobile breakpoint (768px)
│       │   └── use-toast.ts    # Toast notifications
│       ├── components/
│       │   ├── AppSidebar.tsx          # Navigation sidebar
│       │   ├── AlertCard.tsx           # Alert display
│       │   ├── InventoryChart.tsx      # Recharts chart
│       │   ├── InventoryTable.tsx      # Main inventory table
│       │   ├── ImageAnnotationViewer.tsx # Detection annotations overlay
│       │   ├── ImagePopupDialog.tsx    # Image preview modal
│       │   ├── EditItemDialog.tsx      # Inline item editor
│       │   ├── StatsCard.tsx           # Metric summary cards
│       │   ├── UploadZone.tsx          # Drag-and-drop upload
│       │   ├── ThemeProvider.tsx       # Dark/light mode context
│       │   ├── ThemeToggle.tsx         # Theme switch button
│       │   └── ui/                     # shadcn/ui primitives (40+ components)
│       └── pages/
│           ├── Dashboard.tsx           # /  — stats, charts, latest analysis
│           ├── Upload.tsx              # /upload — batch image analysis
│           ├── Inventory.tsx           # /inventory — date-based tracking table
│           ├── Alerts.tsx              # /alerts — alert management
│           ├── Reports.tsx             # /reports — trend analytics
│           ├── Prompts.tsx             # /prompts — prompt version management
│           ├── TrainingExamples.tsx    # /training — few-shot examples
│           ├── Settings.tsx            # /settings — configuration
│           └── not-found.tsx           # 404
├── server/
│   ├── index.ts                # Express app entry: middleware + Vite integration
│   ├── routes.ts               # All API route handlers (~920 lines)
│   ├── storage.ts              # IStorage interface + DatabaseStorage (Drizzle)
│   ├── db.ts                   # Drizzle ORM + Neon connection setup
│   ├── ai-service.ts           # AI service orchestration
│   ├── vite.ts                 # Vite dev server SSR setup
│   ├── github.ts               # GitHub integration utilities
│   └── models/
│       ├── config.ts           # Model definitions, DetectionResult, AnalysisResponse
│       ├── index.ts            # ModelService — dispatches to provider
│       ├── openai-service.ts   # GPT-5.2 / GPT-4o via Replit AI Integrations
│       ├── anthropic-service.ts# Claude Sonnet/Opus via Anthropic SDK
│       ├── gemini-service.ts   # Gemini 2.5 via Google GenAI SDK
│       ├── openrouter-service.ts # Llama via OpenRouter
│       └── roboflow-service.ts # YOLOv8/v9 CNN detection
├── shared/
│   ├── schema.ts               # Drizzle table definitions + Zod insert schemas
│   └── models/
│       └── chat.ts             # Shared chat model types
├── scripts/
│   ├── create-github-repo.ts   # GitHub repo creation utility
│   └── init-github-repo.ts     # GitHub repo init utility
├── migrations/                 # Drizzle-generated SQL migrations
├── .devcontainer/
│   └── devcontainer.json       # Claude Flow dev container config
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json             # shadcn/ui configuration
├── design_guidelines.md        # UI/UX design specification
└── replit.md                   # Detailed project documentation
```

---

## Development Workflow

### Install & Run

```bash
npm install          # Install all dependencies
npm run dev          # Start dev server (frontend + backend)
npm run build        # Build for production
npm start            # Run production build
npm run check        # TypeScript type checking
npm run db:push      # Apply schema changes to database
```

- Dev server runs on **port 5000** by default (`PORT` env var).
- Vite proxies `/api/*` requests to the Express backend in development.
- The frontend is served from `client/` and built to `dist/public/`.
- The backend is compiled to `dist/index.js` via esbuild.

### TypeScript Path Aliases

```
@/*       → client/src/*
@shared/* → shared/*
```

Use these in imports — do not use relative paths that cross the client/server boundary.

### No Test Suite

There is currently no test framework configured. When adding tests, consider Vitest for the frontend and a similar setup for backend unit tests.

### No Linting Config

No `.eslintrc` or `.prettierrc` is present. Follow the existing code style: 2-space indentation, single quotes in TypeScript, trailing semicolons.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | Neon PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | For OpenAI | Replit OpenAI proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | For OpenAI | Replit OpenAI API key |
| `ANTHROPIC_API_KEY` | For Claude | Anthropic API key |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | For Gemini | Google Gemini API key |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY` | For Llama | OpenRouter API key |
| `ROBOFLOW_API_KEY` | For YOLO | Roboflow API key |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |

At least `DATABASE_URL` and one AI provider key are required for meaningful functionality.

---

## Database

### Schema (`shared/schema.ts`)

All tables use **UUID primary keys** and **automatic timestamps**.

| Table | Purpose |
|-------|---------|
| `users` | Authentication (id, username, password) |
| `inventory_items` | Canonical item registry (name, sku, category, minThreshold, currentCount, location, imageUrl, lastUpdated) |
| `inventory_item_counts` | Per-date count history (itemId, photoDate, absoluteCount, sourceAnalysisId) — unique on `(itemId, photoDate)` |
| `analysis_results` | AI analysis record (itemId, imageUrl, imageHash, detectedCount, confidence, modelType, modelName, annotations) |
| `alerts` | Low-stock / out-of-stock alerts (itemId, severity, message, dismissed) |
| `prompts` | Versioned AI prompts (version, name, description, content, isDefault) — unique `version` |
| `settings` | Key-value configuration store — unique `key` |
| `training_examples` | Few-shot learning images (title, description, imageUrl, detectedItems, isActive) |

### ORM Usage

```typescript
import { db } from "./db";
import { inventoryItems } from "@shared/schema";
import { eq } from "drizzle-orm";

const items = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
```

All DB operations go through `server/storage.ts` — use the `IStorage` interface, never query the DB directly from route handlers.

### Migrations

```bash
npm run db:push   # Push schema changes (development shortcut)
```

For production migrations, use `drizzle-kit generate` then run the migration files in `migrations/`.

---

## API Reference

All routes are prefixed with `/api`. Defined in `server/routes.ts`.

### Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | List all inventory items |
| POST | `/api/inventory` | Create item |
| PATCH | `/api/inventory/:id` | Update item |
| DELETE | `/api/inventory/:id` | Delete item |
| GET | `/api/inventory-with-history` | Items with date-count history |
| DELETE | `/api/inventory/:itemId/counts/:photoDate` | Remove a date's count entry |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analysis` | List analysis results |
| GET | `/api/analysis/summary` | Aggregated summary |
| GET | `/api/analysis/:id` | Single result |
| POST | `/api/analyze` | Upload image + run AI analysis (multipart) |

### Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alerts` | List active alerts |
| POST | `/api/alerts/:id/dismiss` | Dismiss one alert |
| POST | `/api/alerts/dismiss-all` | Dismiss all alerts |

### Prompts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | List all prompt versions |
| POST | `/api/prompts` | Create prompt version |
| GET | `/api/prompts/default` | Get the default prompt |
| GET/PATCH/DELETE | `/api/prompts/:id` | Single prompt CRUD |
| POST | `/api/prompts/:id/set-default` | Set as default |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | All settings |
| POST | `/api/settings` | Upsert setting |
| GET | `/api/settings/:key` | Single setting |
| GET | `/api/models` | Available AI models list |
| GET | `/api/stats` | Dashboard statistics |
| GET/POST | `/api/training-examples` | Few-shot examples |
| GET/PATCH/DELETE | `/api/training-examples/:id` | Single example CRUD |

---

## Frontend Architecture

### Routing (`client/src/App.tsx`)

Uses **Wouter** for client-side routing. Routes:

```
/               → Dashboard
/upload         → Upload
/inventory      → Inventory
/alerts         → Alerts
/reports        → Reports
/prompts        → Prompts
/training       → TrainingExamples
/settings       → Settings
```

### Data Fetching

**TanStack Query** with `staleTime: Infinity` — data is considered fresh indefinitely. Invalidate queries explicitly after mutations:

```typescript
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
```

All query keys are the API path strings (e.g., `["/api/inventory"]`).

### Component Library

- Use **shadcn/ui** components from `client/src/components/ui/` — do not reach for external component libraries.
- Import with `@/components/ui/button` (using the `@/*` alias).
- The shadcn/ui style is **new-york** with CSS variables enabled.

### Theming

- Dark/light mode via `ThemeProvider` + CSS class on `<html>`.
- All colors defined as HSL CSS variables in `client/src/index.css`.
- Never hardcode colors — use Tailwind semantic classes (`bg-background`, `text-foreground`, `border`, etc.).

### State Management

- Server state: TanStack Query.
- Local/UI state: `useState` / `useReducer`.
- No global client state store (no Redux/Zustand).

---

## Backend Architecture

### Request Flow

```
HTTP Request
  → Express middleware (JSON, logging)
  → routes.ts handler
  → storage.ts (IStorage methods)
  → Drizzle ORM
  → Neon PostgreSQL
```

For image analysis:

```
POST /api/analyze (multipart image)
  → routes.ts
  → Check image hash cache (storage.getAnalysisByHash)
  → ModelService.analyzeImage (server/models/index.ts)
    → Provider service (OpenAI / Anthropic / Gemini / etc.)
  → Normalize item names
  → Upsert inventory_items + inventory_item_counts
  → Create/update alerts if below threshold
  → Return analysis result
```

### Storage Layer (`server/storage.ts`)

All database interactions go through the `IStorage` interface. This abstraction allows swapping the storage backend. Always use `storage.*` methods in route handlers rather than calling `db` directly:

```typescript
// Good
const items = await storage.getInventoryItems();

// Avoid in routes.ts
const items = await db.select().from(inventoryItems);
```

### Error Handling

Express error middleware in `server/index.ts` catches thrown errors. In route handlers, wrap async operations in try/catch and call `next(err)` or return a `500` response with `{ message: err.message }`.

---

## AI / Model System

### Model Selection

Models are defined in `server/models/config.ts`. Each model has:

```typescript
{
  id: string,          // e.g. "gpt-5.2"
  name: string,        // Display name
  provider: string,    // "openai" | "anthropic" | "gemini" | "openrouter" | "roboflow"
  type: "llm" | "cnn", // LLM-based vision vs CNN object detection
  description: string
}
```

### Analysis Pipeline

1. **Prompt construction**: Default (or user-selected) prompt + active training examples.
2. **Model dispatch**: `ModelService.analyzeImage()` routes to provider service.
3. **Response parsing**: All providers return `AnalysisResponse` with `DetectionResult[]`.
4. **Item normalization**: Brand + product type extracted, names deduplicated.
5. **Confidence filtering**: Results below the configured threshold are discarded.
6. **DB upsert**: New items created; existing items matched by normalized name similarity.

### Adding a New Model

1. Add provider credentials to environment variables.
2. Define the model in `server/models/config.ts`.
3. Create or extend a service file in `server/models/`.
4. Add a dispatch case in `server/models/index.ts`.

### Prompt System

- Prompts are versioned in the `prompts` table.
- One prompt is marked `isDefault = true`.
- At analysis time, the default (or user-chosen) prompt content is used.
- Active training examples are appended to the prompt as few-shot context.

---

## Key Conventions

### TypeScript

- **Strict mode** is enabled — no implicit `any`.
- Use `@shared/schema` types from Zod schemas for API bodies; never accept raw `any`.
- Server and client share types via `shared/` — import with `@shared/*`.
- Prefer `type` over `interface` for simple shapes; use `interface` when extending.

### File Organization

- New pages go in `client/src/pages/` and must be registered in `App.tsx`.
- New reusable components go in `client/src/components/`.
- New UI primitives (shadcn) go in `client/src/components/ui/`.
- New API routes go in `server/routes.ts`; new storage methods in `server/storage.ts` and `IStorage`.

### Naming

- React components: `PascalCase` files and exports.
- Hooks: `use-kebab-case.ts` files, `useCamelCase` exports.
- Server files: `kebab-case.ts`.
- Database columns: `camelCase` (Drizzle default mapping).
- API routes: lowercase kebab-case paths (`/api/training-examples`).

### Imports

Always use path aliases — avoid deep relative paths:

```typescript
import { Button } from "@/components/ui/button";
import { inventoryItems } from "@shared/schema";
```

### Tailwind CSS

- Use semantic color tokens (`bg-background`, `text-muted-foreground`, `border`) — not hardcoded palette values.
- Use spacing multiples of 4 (`p-4`, `gap-6`, `mt-8`).
- Dark mode is handled via CSS variables — no `dark:` prefixes needed for semantic colors.
- Responsive: `lg:` for desktop, `md:` for tablet, default for mobile.

### Database

- All mutations should invalidate relevant TanStack Query keys on the client.
- Use `upsert` patterns for `inventory_item_counts` (unique on `itemId + photoDate`).
- Always seed the default prompt in `DatabaseStorage` constructor.

---

## Design System

From `design_guidelines.md`:

- **Fonts**: Inter (UI text) + JetBrains Mono (data/code).
- **Layout**: 12-column grid, sidebar 64px (collapsed) / 256px (expanded), `max-w-7xl` container.
- **Spacing**: Tailwind units 2 / 4 / 6 / 8 / 16 (8px base).
- **Border radius**: 3px (small), 6px (medium), 9px (large).
- **Accessibility**: ARIA labels on all interactive elements, minimum `h-10` touch targets.
- **Images**: Camera feed 16:9, thumbnails 64×64px.
- **Inspiration**: Linear + Notion — minimal, data-dense, professional.

---

*Last updated: 2026-03-04*
