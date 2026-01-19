# WarehouseVision - AI-Powered Inventory Management System

## Overview

WarehouseVision is a full-stack warehouse inventory tracking and management system that uses AI-powered image analysis to detect and count inventory items. The application provides real-time inventory monitoring, automated alerts for low stock levels, comprehensive reporting capabilities, and configurable settings including image caching control. Built with a modern React frontend and Express backend, it leverages OpenAI's vision capabilities through Replit's AI Integrations service to analyze warehouse images and automatically update inventory counts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript using Vite as the build tool

**UI Component System**: shadcn/ui (Radix UI primitives) with Tailwind CSS for styling
- Design philosophy follows modern dashboard patterns inspired by Linear and Notion
- Emphasis on data clarity, scannable information hierarchy, and quick access to alerts
- Typography uses Inter for general UI and JetBrains Mono for numerical/monospace data
- Custom theme system with light/dark mode support using CSS variables
- Component library includes cards, tables, charts, dialogs, and form elements

**State Management**: 
- TanStack Query (React Query) for server state management with aggressive caching
- Local React state for UI interactions
- Query client configured with `staleTime: Infinity` and disabled automatic refetching

**Routing**: Wouter for lightweight client-side routing

**Key Pages**:
- Dashboard: Overview with stats, charts, recent alerts, and latest analyzed warehouse image with detections
- Upload: File upload interface for analyzing warehouse images with **multi-image batch upload support**, prompt selection dropdown, photo date picker for tracking when images were taken, and thumbnail display after analysis. Processes multiple images sequentially with progress tracking and aggregated results display
- Inventory: Date-based inventory tracking table showing items with count history across multiple dates. Features dynamic date columns, delta indicators (green for increase, red for decrease), per-date count deletion, and search/edit/delete functionality
- Alerts: Centralized alert management with dismiss functionality
- Reports: Analytics and charts showing inventory trends
- AI Prompts: Prompt versioning management page for creating, editing, and managing AI detection prompts with version control
- Training Examples: Few-shot learning page for uploading example warehouse images with accurate counts and counting methodologies to improve AI detection accuracy
- Settings: Configuration page for system preferences including image caching toggle for testing purposes and configurable confidence threshold

**Image Display Features**:
- Upload page displays analyzed warehouse images as thumbnails after AI processing
- Inventory table shows 56x56px item image thumbnails with fallback icons
- Dashboard displays the most recent analyzed image with detection overlays
- All images stored as base64 data URLs in inventory items and analysis results

**Data Visualization**: Recharts for inventory charts and trends

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful API structure
- `/api/inventory` - CRUD operations for inventory items
- `/api/analyze` - Image upload and AI analysis endpoint (accepts optional promptId for custom prompt versions)
- `/api/alerts` - Alert management and dismissal
- `/api/stats` - Dashboard statistics aggregation
- `/api/prompts` - CRUD operations for AI prompt versions (GET, POST, PATCH, DELETE, set-default)

**File Upload**: Multer middleware for handling multipart/form-data with 10MB file size limit and in-memory storage

**AI Integration**: OpenAI GPT-5 vision model accessed through Replit's AI Integrations service
- Analyzes warehouse images to detect and count inventory items
- Returns structured JSON with detected items, counts, confidence levels, and locations
- Processes base64-encoded images with configurable item detection lists
- Automatically creates inventory items for newly detected products with auto-generated SKUs (only if confidence meets configurable threshold, default 80%)
- Stores full base64 image data URLs with inventory items and analysis results for display
- Implements SHA-256 image hashing for duplicate detection to prevent double-counting
- Returns cached results when same image uploaded multiple times without updating inventory counts
- **Image Caching Control**: Users can disable caching via Settings page to analyze the same image multiple times for testing
  - Setting stored in localStorage as "imageCachingEnabled" (default: true)
  - When disabled, bypasses cache check and re-analyzes identical images
  - Useful for testing different prompts on the same image or re-analyzing after deleting inventory items
- Uses user-provided recognition instructions from inventory items to improve detection accuracy
- Dynamically incorporates custom item-specific prompts into AI analysis for better results
- Filters low-confidence detections: items detected with <80% confidence are skipped and reported to user but not added to inventory
- **Prompt Versioning System**: Allows users to create, edit, and manage different AI prompt versions to optimize detection accuracy
  - Supports versioned prompts (v1.0, v1.1, v2.0, etc.) with name, description, and content
  - Only one prompt can be marked as default at a time
  - Upload page auto-selects default prompt but allows manual selection
  - Analyze endpoint uses stored default prompt when no specific promptId provided
  - Cannot delete the default prompt (must set another as default first)
- **Few-Shot Learning System**: Users can provide training examples to improve AI detection accuracy
  - Training examples consist of warehouse images with accurate item counts and counting methodologies
  - Examples include item types, exact counts, and step-by-step counting methods (e.g., "4 rows x 6 cans = 24")
  - Active examples are automatically incorporated into AI prompts during image analysis
  - Examples can be toggled active/inactive to control which ones are used
  - Training examples help the AI learn specific counting patterns for similar warehouse setups
- **Item Name Normalization**: Automatically consolidates similar items by brand name + product type
  - AI-detected item descriptions are simplified to "Brand Product" format (e.g., "Kettle Chips" instead of "Kettle Chips assorted flavors 36-bag snack cases")
  - Uses comprehensive lists of known brand names (multi-word and single-word) for accurate brand extraction
  - Product type detection uses word-boundary matching to categorize items (chips, soda, candy, etc.)
  - Similarity matching compares simplified names to prevent duplicate inventory entries for the same product
  - Existing items with detailed descriptions will match to new simplified items automatically

**Data Validation**: Zod schemas with Drizzle-Zod integration for type-safe validation

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Provider**: Neon serverless PostgreSQL (configured via `@neondatabase/serverless`)

**Schema Design**:
- `users` - User authentication (id, username, password)
- `inventory_items` - Core inventory records (id, name, sku, category, counts, thresholds, location, images, userInput, timestamps)
- `inventory_item_counts` - Historical count tracking per date (id, itemId, photoDate, absoluteCount, sourceAnalysisId, createdAt) with unique constraint on (itemId, photoDate)
- `analysis_results` - AI analysis history (id, itemId, imageUrl, imageHash, detectedCount, confidence, annotations, timestamp)
- `alerts` - Low stock and out-of-stock alerts (id, itemId, severity, message, dismissed status, createdAt)
- `prompts` - AI prompt versions for object detection (id, version, name, description, content, isDefault, createdAt)
- `training_examples` - Few-shot learning examples (id, title, description, imageUrl, detectedItems JSON, isActive, createdAt) for improving AI detection accuracy with user-provided examples

**Storage Strategy**: Database-backed storage using PostgreSQL (`DatabaseStorage`) that implements the `IStorage` interface. All data (inventory, prompts, alerts, analysis results) persists across application restarts. Uses Neon serverless PostgreSQL with Drizzle ORM for type-safe database queries. Note: Base64 image storage is memory-intensive; monitor usage if dataset grows.

**Key Architectural Decisions**:
- UUID primary keys generated via PostgreSQL's `gen_random_uuid()`
- Timestamps with automatic defaulting to current time
- Unique constraints on username and SKU fields
- Separate analysis results table for historical tracking
- Alert severity levels: critical, warning, info

### Design System

**Color System**: HSL-based custom color variables for consistent theming
- Semantic color tokens (primary, secondary, destructive, muted, accent)
- Separate background colors for cards, popovers, and sidebar
- Border colors with opacity variations for depth

**Spacing System**: Tailwind's standard spacing scale (2, 4, 6, 8, 16)
- Micro spacing (p-4, gap-2) for elements within cards
- Component spacing (p-6, gap-4)
- Section spacing (p-8, gap-6)

**Component Patterns**:
- Elevation system using hover/active states with opacity-based overlays
- Shadow system for depth (shadow-xs, shadow-sm, shadow-md, shadow-lg)
- Rounded corners (sm: 3px, md: 6px, lg: 9px)

## External Dependencies

### Third-Party Services

**AI Service**: Replit AI Integrations (OpenAI-compatible)
- Environment variables: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`
- Model: GPT-5 vision capabilities for image analysis
- Purpose: Warehouse image analysis and inventory counting

**Database Service**: Neon Serverless PostgreSQL
- Environment variable: `DATABASE_URL`
- Connection pooling via `@neondatabase/serverless` driver
- Schema migrations managed through Drizzle Kit

### Key NPM Dependencies

**Frontend**:
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Headless UI component primitives (20+ components)
- `react-hook-form` with `@hookform/resolvers` - Form management
- `recharts` - Data visualization
- `wouter` - Lightweight routing
- `date-fns` - Date formatting and manipulation
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` & `clsx` - Conditional className management

**Backend**:
- `express` - Web framework
- `drizzle-orm` - Type-safe ORM
- `drizzle-zod` - Schema validation
- `multer` - File upload handling
- `openai` - AI API client
- `connect-pg-simple` - PostgreSQL session store

**Development**:
- `vite` - Build tool and dev server
- `tsx` - TypeScript execution
- `esbuild` - Production bundling
- `@replit/*` plugins - Replit-specific development enhancements

### Build and Deployment

**Development**: `tsx` for hot-reloading TypeScript execution
**Production Build**: Vite for frontend bundling, esbuild for backend bundling
**Environment**: Designed for Replit deployment with platform-specific plugins and configurations