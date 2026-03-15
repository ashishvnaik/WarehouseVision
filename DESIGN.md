# WarehouseVision — Role-Based UX Redesign: Design and Test Plan

**Stack context:** Express + TypeScript backend, React + Wouter + TanStack Query frontend, Drizzle ORM, PostgreSQL (Neon), shadcn/ui, Tailwind CSS. `express-session` and `memorystore` are already present in `package.json`.

---

## 1. Authentication Design

### Session Infrastructure

The project already has `express-session` (v1.18.1) and `memorystore` (v1.6.7) in `package.json`. No additional packages are required.

**`server/index.ts` — session middleware** (add before `registerRoutes`):

```typescript
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

app.use(session({
  secret: process.env.SESSION_SECRET || 'wv-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({ checkPeriod: 86400000 }), // prune expired entries daily
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8-hour session
    sameSite: 'strict',
  },
}));
```

**Session type augmentation** (add to `server/index.ts` or a `server/types.ts`):

```typescript
declare module 'express-session' {
  interface SessionData {
    role: 'operator' | 'supervisor' | 'programmer' | 'superuser';
    testingMode: boolean;  // per-session flag, only meaningful for programmer role
  }
}
```

### Environment Variables

Add five new variables alongside the existing ones in `.env` / Railway secrets:

| Variable | Description |
|---|---|
| `ROLE_OPERATOR_PASSWORD` | Password for Operator login |
| `ROLE_SUPERVISOR_PASSWORD` | Password for Supervisor login |
| `ROLE_PROGRAMMER_PASSWORD` | Password for Programmer login |
| `ROLE_SUPERUSER_PASSWORD` | Password for SuperUser login |
| `SESSION_SECRET` | Random secret for express-session signing |

Passwords are never stored in the database. They are compared at login time directly from `process.env`.

### Login Page (`/login`)

New file: `client/src/pages/Login.tsx`

Layout: centered card (max-w-sm), no sidebar visible.

Fields:
1. **Role selector** — Radix `RadioGroup` with four options displayed as styled tabs: Operator, Supervisor, Programmer, SuperUser.
2. **Password** — shadcn `Input` type="password" with show/hide toggle.
3. **Login button** — calls `POST /api/auth/login`.

On success: redirect to role's default landing page (see per-role sections). On failure: inline error message "Incorrect password. Try again." — do not reveal whether the role itself is invalid.

### Auth Routes (`server/routes.ts`)

```
POST /api/auth/login
  Body: { role: string, password: string }
  Validates role is one of the four valid roles.
  Compares password against process.env[`ROLE_${role.toUpperCase()}_PASSWORD`].
  On match: req.session.role = role; res.json({ role })
  On mismatch: res.status(401).json({ error: 'Invalid credentials' })

POST /api/auth/logout
  req.session.destroy(); res.json({ success: true })

GET /api/auth/me
  If req.session.role exists: res.json({ role: req.session.role })
  Else: res.status(401).json({ error: 'Not authenticated' })
```

### Backend Middleware

New function `requireAuth` added to `server/routes.ts` before route registrations:

```typescript
type Role = 'operator' | 'supervisor' | 'programmer' | 'superuser';

const ROLE_HIERARCHY: Record<Role, number> = {
  operator: 1, supervisor: 2, programmer: 3, superuser: 4,
};

function requireAuth(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.session?.role as Role | undefined;
    if (!role) return res.status(401).json({ error: 'Authentication required' });
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Convenience helpers
const requireSupervisorPlus = requireAuth(['supervisor', 'superuser']);
const requireProgrammerPlus = requireAuth(['programmer', 'superuser']);
const requireSuperUser      = requireAuth(['superuser']);
const requireAnyRole        = requireAuth(['operator', 'supervisor', 'programmer', 'superuser']);
```

### Frontend Auth Context

New file: `client/src/contexts/AuthContext.tsx`

```typescript
interface AuthContextValue {
  role: Role | null;
  isLoading: boolean;
  testingMode: boolean;
  login: (role: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTestingMode: (enabled: boolean) => Promise<void>;
}
```

Implementation:
- On mount, calls `GET /api/auth/me` to restore session (returns `{ role, testingMode }`).
- `login()` calls `POST /api/auth/login`, updates local role + testingMode state, redirects.
- `logout()` calls `POST /api/auth/logout`, clears role state and TanStack Query cache, redirects to `/login`.
- `setTestingMode()` calls `POST /api/auth/testing-mode`, updates local `testingMode` state.
- Wrap the entire `App` tree in `<AuthProvider>`.

### Frontend Route Protection

New file: `client/src/components/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  component: React.ComponentType;
  allowedRoles: Role[];
}
```

Logic:
1. If `isLoading`: render a centered `Skeleton` (prevents flash).
2. If `role === null`: `<Redirect to="/login" />` using Wouter.
3. If `role` not in `allowedRoles`: render `<ForbiddenPage />` (403 page).
4. Otherwise: render `<Component />`.

**`App.tsx` restructure**: The `/login` route renders outside the sidebar layout. The sidebar layout is only rendered when the user is authenticated.

### Logout

Add a **Logout button** in the sidebar footer (`AppSidebar.tsx`), replacing the current copyright text. Calls `logout()` from `AuthContext`.

---

## 2. Role Permissions Matrix

| Page / Feature | Operator | Supervisor | Programmer | SuperUser |
|---|---|---|---|---|
| `/login` | Yes | Yes | Yes | Yes |
| `/` Dashboard | No | **Yes (default)** | No | **Yes (default)** |
| `/upload` Upload | **Yes (default)** | No | No | Yes |
| `/inventory` | No | Yes | No | Yes |
| `/reports` | No | Yes | No | Yes |
| `/alerts` | No | Yes | No | Yes |
| `/prompts` | No | No | **Yes (default)** | Yes |
| `/training-examples` | No | No | Yes | Yes |
| `/my-uploads` (new) | Yes | No | No | Yes |
| `/evaluation` (new) | No | No | Yes | Yes |
| `/settings` | No | No | No | **Yes** |
| **Inventory: Verify count** | No | Yes | No | Yes |
| **Inventory: Merge items** | No | Yes | No | Yes |
| **Inventory: Edit count inline** | No | Yes (existing) | No | Yes |
| **Sidebar: Testing Mode toggle** | No | No | Yes | No |
| **POST /api/analyze → inventory** | Always saves | n/a | Skipped when their session has Testing Mode ON | Always saves |
| **Delete image (analysis result)** | Yes (own uploads only) | Yes (any image) | No | Yes |
| **GET /api/inventory** | No | Yes | No | Yes |
| **GET /api/stats** | No | Yes | No | Yes |
| **GET/POST/PATCH/DELETE /api/prompts** | No | No | Yes | Yes |
| **GET/POST /api/training-examples** | No | No | Yes | Yes |
| **GET/POST /api/settings** | No | No | No | Yes |
| **POST /api/inventory/merge** | No | Yes | No | Yes |
| **POST /api/inventory/:id/counts/:date/verify** | No | Yes | No | Yes |
| **POST /api/evaluate** | No | No | Yes | Yes |
| **POST /api/auth/testing-mode** | No | No | Yes (own session only) | No |
| **DELETE /api/analysis/:id** | Yes (own uploads) | Yes (any) | No | Yes |

---

## 3. UX Design Per Role

### Operator

**Default landing page:** `/upload`

**Sidebar contents:** Two items — "Upload" (Camera icon) and "My Uploads" (Clock/History icon) → `/my-uploads`. On mobile the sidebar trigger is hidden; the page is full-width.

**App header:** Shows only the WarehouseVision logo text and a logout button (icon button, top-right). No ThemeToggle.

**Upload page modifications for Operator:**

1. **Simplified model selector**: `<Select>` with only display names. Pre-selects the default model from settings.

2. **Photo Date field**: Already exists. Use a native `<input type="date">` wrapped in shadcn styling for better mobile compatibility.

3. **"Take Photo" button**: Added alongside the drag-and-drop zone. Triggers `<input type="file" accept="image/*" capture="environment">` — opens the device camera directly on mobile browsers.

4. **Image Quality Feedback Panel** (new, shown after upload completes):

   This panel replaces the current raw results list for Operator users. It appears as a `Card` below the upload zone.

   **Panel sections:**

   - **Clarity indicator**: Derived from the average `confidence` of `savedResults`.
     - If average confidence < 70%: amber badge "Blurry — low confidence detected"
     - If >= 70%: green badge "Clear"

   - **Coverage indicator**: Parsed from the `imageDescription` / `annotations` field.
     - If description contains keywords like "cut off", "partial", "edge", "out of frame" (case-insensitive): amber badge "Some items may be cut off"
     - Otherwise: green badge "Good coverage"

   - **Overall Quality Score**:
     - Both green → "Good" (green)
     - Either amber → "Fair" (amber)
     - Both amber or average confidence < 50% → "Poor" (red)

   - **Actionable message**:
     - Good: "Image looks great. Results saved to inventory."
     - Fair: "Results saved, but consider retaking for better accuracy."
     - Poor: "Image quality is too low. Please retake and re-upload."

   - **Detected Items list** (read-only): Simple `<ul>` of `itemType: count` pairs. No edit buttons.

   - **Retake button** (shown when quality is Fair or Poor): Clears results and resets the upload form.

   - **Delete Image button** (always shown in the feedback panel): A `<Button variant="destructive" size="sm">` (Trash icon) labeled "Delete Image". On click, shows a confirmation dialog: "Are you sure? This will remove the image and its detected counts from the database." On confirm, calls `DELETE /api/analysis/:id` using the `analysisResultId` returned by the upload. On success, clears the feedback panel and resets the upload form. This allows an operator to undo an accidental or poor-quality upload.

5. **"My Uploads" page** (new route: `/my-uploads`, Operator + SuperUser only):
   - Shows all `analysis_results` uploaded in the current session (tracked client-side via a React state list of IDs accumulated during the session, stored in `sessionStorage` so it persists across page refreshes but clears on logout).
   - Displayed as a card grid: each card shows the image thumbnail, upload timestamp, detected items summary, and quality score badge.
   - Each card has a **Delete Image** button (same behavior as in the Quality Feedback panel).
   - No edit capability.

6. **Mobile-specific Tailwind adjustments:**
   - All buttons: `h-14` (56px touch target) on mobile, `h-10` on desktop
   - Text size: `text-base` minimum for all labels
   - Card padding: `p-4` on mobile, `p-6` on desktop

---

### Supervisor

**Default landing page:** `/` (Dashboard)

**Sidebar contents:**
```
Navigation:
  Dashboard  → /
  Inventory  → /inventory
  Reports    → /reports
  Alerts     → /alerts
Footer: Logout button
```

**Inventory page additions:**

1. **Verify button per count row:**
   - Each count row gets a `<Button variant="outline" size="sm">Verify</Button>` (CheckCircle icon).
   - On click: calls `POST /api/inventory/:itemId/counts/:photoDate/verify`.
   - After success: button replaced by green `<Badge>Verified</Badge>`.
   - Verified rows get a left border accent: `border-l-2 border-green-500`.
   - The `inventoryItemCounts` table gains a `verifiedAt` timestamp column (nullable). Non-null = human-verified.

2. **Merge Items button:**
   - Global button in the page header next to the search bar.
   - Opens a `<Dialog>` with:
     - "Source item" — searchable `<Select>` of all inventory items
     - "Target item (keep this one)" — second `<Select>` excluding source
     - "Canonical name" — `<Input>` pre-filled with target item's name, editable
     - **"On date conflict, keep:"** — `<RadioGroup>` with three options shown only when both items have overlapping dates (detected client-side by comparing their count histories):
       - "Source count" — keep the source item's count for conflicting dates
       - "Target count" — keep the target item's count for conflicting dates
       - "Larger of the two" *(default)* — keep whichever count is higher
     - "Merge" confirmation button
   - On confirm: calls `POST /api/inventory/merge` with `{ sourceId, targetId, canonicalName, conflictResolution: 'source' | 'target' | 'max' }`.
   - On success: invalidates `/api/inventory` and `/api/inventory-with-history` queries.

3. **Delete Image button per count row:**
   - Each count row in the date history gets a trash icon button alongside the existing "Verify" button.
   - On click: shows a confirmation dialog "Delete this image and its counts?".
   - On confirm: calls `DELETE /api/analysis/:sourceAnalysisId` using the `sourceAnalysisId` field already stored on each `inventory_item_counts` row.
   - On success: the count row disappears; if it was the last count for that item, the item's `currentCount` drops to 0.
   - If a count row has no `sourceAnalysisId` (manually created count), the delete button is hidden.

4. **Inline count editing**: Already exists. Keep unchanged.

---

### Programmer

**Default landing page:** `/prompts`

**Sidebar contents:**
```
Navigation:
  AI Prompts          → /prompts
  Training Examples   → /training-examples
  Evaluation          → /evaluation  [NEW]

Testing Mode toggle   (persistent, in sidebar between header and nav)
Footer: Logout button
```

**Testing Mode toggle:**

The toggle is a `<Switch>` in the sidebar. Its state is **per-session** — stored in `req.session.testingMode` on the server, not in the database. Initial value is `false` whenever a Programmer logs in. Toggling calls `POST /api/auth/testing-mode`.

Testing Mode is **only available to the Programmer role**. SuperUser always uploads to the real inventory (their own testing would be done by logging in as Programmer).

When Testing Mode is ON (for this programmer's session only):
- Sidebar toggle shows amber/yellow with label "TESTING MODE ON".
- A sticky amber banner renders at the top of `<main>`:
  `"TESTING MODE ACTIVE — your uploads will not be saved to inventory"`
  — styled with `bg-amber-100 border-b border-amber-300 text-amber-900 text-sm font-medium px-4 py-2 text-center`
- Banner is only visible to this programmer in this session. Other concurrent users (e.g., Operator, Supervisor) are completely unaffected.
- When this programmer calls `POST /api/analyze`, the server checks `req.session.testingMode`. If true: skips all inventory upserts and saves analysis with `isTest=1`.
- Logging out resets testing mode to OFF.

**Evaluation page** (new file: `client/src/pages/Evaluation.tsx`, route: `/evaluation`):

Layout: Two-column on desktop (`lg:grid-cols-2`), single column on mobile.

*Left panel — Configuration:*
- **Prompt version selector**: `<Select>` from `GET /api/prompts` (version + name).
- **Model selector**: `<Select>` from `GET /api/models`, grouped by provider.
- **Image source** (two radio options):
  1. "Upload new test image" — shows `<UploadZone>` (reuse existing component)
  2. "Select from existing analysis images" — searchable gallery grid from `GET /api/analysis/summary`; each item shows thumbnail and timestamp; clicking selects it.
- **Run Inference button**: disabled until prompt, model, and image are all selected.

*Right panel — Results:*
- Shown after clicking Run Inference.
- Calls `POST /api/evaluate` with `{ promptId, modelId, imageUrl|imageFile, analysisId? }`.
- Displays: detected items list, counts, confidence scores, image description.
- **"Save as Training Example" button** per detected item: opens inline dialog pre-filled with item data, calls `POST /api/training-examples` on save.
- **Side-by-side comparison**: if user runs a second inference, a "Compare with previous run" toggle appears; enabling it renders both result panels side-by-side.

---

### SuperUser

**Default landing page:** `/` (Dashboard)

**Sidebar contents:** Full union of all role menus:
```
Navigation:
  Dashboard           → /
  Upload              → /upload
  Inventory           → /inventory
  Reports             → /reports
  Alerts              → /alerts
  AI Prompts          → /prompts
  Training Examples   → /training-examples
  Evaluation          → /evaluation

Testing Mode toggle

Settings group:
  Settings            → /settings

Footer: Logout button
```

No new pages needed. SuperUser sees and can operate every feature of every role.

On the Upload page, SuperUser gets the existing full raw results view (not the Operator quality feedback panel).

---

## 4. New and Modified Pages

| File | Status | Changes |
|---|---|---|
| `client/src/pages/Login.tsx` | **NEW** | Full-page login form, no sidebar, role selector + password |
| `client/src/pages/MyUploads.tsx` | **NEW** | Operator's session upload history with delete capability |
| `client/src/pages/Evaluation.tsx` | **NEW** | Programmer/SuperUser evaluation interface |
| `client/src/contexts/AuthContext.tsx` | **NEW** | Session state, login/logout, role |
| `client/src/components/ProtectedRoute.tsx` | **NEW** | Role-gated route wrapper |
| `client/src/App.tsx` | **MODIFIED** | AuthProvider, conditional sidebar, ProtectedRoute on all routes, testing mode banner |
| `client/src/components/AppSidebar.tsx` | **MODIFIED** | Role-aware nav items, Testing Mode toggle, Logout button |
| `client/src/pages/Upload.tsx` | **MODIFIED** | Image Quality Feedback panel (Operator), Take Photo button |
| `client/src/pages/Inventory.tsx` | **MODIFIED** | Verify button, Merge Items dialog, verified row styling |
| `server/index.ts` | **MODIFIED** | express-session + MemoryStore setup, SessionData type |
| `server/routes.ts` | **MODIFIED** | Auth routes, new feature routes, requireAuth on all existing routes |
| `shared/schema.ts` | **MODIFIED** | `isTest` on analysisResults, `verifiedAt` on inventoryItemCounts |

---

## 5. Database Changes

### `analysis_results` — add `isTest` column
```typescript
isTest: integer("is_test").notNull().default(0),
```
`0` = real inventory analysis. `1` = test run (skips inventory upsert). Test results are retained in `analysis_results` for Programmer evaluation but excluded from stats and dashboard counts.

### `inventory_item_counts` — add `verifiedAt` column
```typescript
verifiedAt: timestamp("verified_at"),
```
`null` = AI-inferred only. Non-null = Supervisor-verified with timestamp.

### `IStorage` additions
```typescript
mergeInventoryItems(sourceId: string, targetId: string, canonicalName: string): Promise<InventoryItem>;
verifyItemCount(itemId: string, photoDate: string): Promise<InventoryItemCount | undefined>;
deleteAnalysisResult(id: string): Promise<boolean>;  // also deletes linked count row
```

### Sessions
Kept in-memory (`MemoryStore`). Sessions do not survive server restarts — acceptable for this use case. No new DB table required.

---

## 6. API Changes

### New Routes

**`POST /api/auth/login`**
```
Body: { role, password }
- Validate role is one of four valid strings → 400 if not
- Compare password against process.env[`ROLE_${role.toUpperCase()}_PASSWORD`]
- If env var not set → 500 "Role not configured"
- Match: req.session.role = role; return { role }
- No match: return 401 { error: 'Invalid credentials' }
```

**`POST /api/auth/logout`**
```
req.session.destroy(); return { success: true }
```

**`GET /api/auth/me`**
```
return req.session.role ? { role } : 401
```

**`POST /api/auth/testing-mode`**
```
Middleware: requireAuth(['programmer'])  — programmer only, NOT superuser
Body: { enabled: boolean }
req.session.testingMode = enabled
Return: { testingMode: boolean }
```

**`DELETE /api/analysis/:id`**
```
Middleware: requireAuth(['operator', 'supervisor', 'superuser'])
1. Find analysis_result by id → 404 if not found
2. Find inventory_item_counts row where sourceAnalysisId = id → delete it if found
3. Recalculate currentCount on the linked inventoryItem (set to max remaining count, or 0 if none)
4. Delete the analysis_result row
5. Return { success: true }
```

**`POST /api/inventory/merge`**
```
Middleware: requireSupervisorPlus
Body: { sourceId, targetId, canonicalName, conflictResolution: 'source' | 'target' | 'max' }
1. Verify both items exist → 404 if not
2. Verify sourceId !== targetId → 400
3. For each count row where itemId = sourceId:
     - If targetId already has a count for that date:
         conflictResolution = 'source' → replace target count with source count
         conflictResolution = 'target' → keep target count, delete source row
         conflictResolution = 'max'    → keep whichever count is higher (default)
     - If not: update row's itemId to targetId
4. Update all analysisResults where itemId = sourceId → set itemId = targetId
5. Update targetId item name to canonicalName
6. Recalculate currentCount on targetId (= max of all its remaining count history)
7. Delete sourceId inventory item
8. Return updated targetId item
```

**`POST /api/inventory/:itemId/counts/:photoDate/verify`**
```
Middleware: requireSupervisorPlus
- Find inventory_item_counts row for (itemId, photoDate) → 404 if not found
- Set verifiedAt = NOW()
- Return updated count row
```

**`POST /api/evaluate`**
```
Middleware: requireProgrammerPlus
Body: multipart with optional image file OR JSON { analysisId, promptId, modelId }
1. Determine image: uploaded file OR fetch from existing analysisResult.imageUrl
2. Run full model dispatch pipeline (same as /api/analyze)
3. ALWAYS skip inventory upserts and alert generation
4. Save analysis_result with isTest=1
5. Return full AnalysisResponse + saved analysisResult.id
```

### Modified Routes

**`GET /api/auth/me`** — updated response:
```
return req.session.role
  ? { role: req.session.role, testingMode: req.session.testingMode ?? false }
  : 401
```

**`POST /api/analyze`** — Testing Mode gate (per-session):
```typescript
const isTestingMode = req.session.role === 'programmer' && req.session.testingMode === true;

// Gate inventory upserts:
if (!isTestingMode) {
  // create/update inventoryItems
  // upsertItemCount
  // createAlert if below threshold
}

// Set isTest flag on analysis result:
await storage.createAnalysisResult({ ...fields, isTest: isTestingMode ? 1 : 0 });

// Modify response when in testing mode:
if (isTestingMode) {
  return res.json({ success: true, testMode: true, analysisResult, savedResults, message: 'Testing mode active — results not saved to inventory.' });
}
```

**Middleware additions to existing routes:**

| Route(s) | Middleware |
|---|---|
| `GET /api/inventory`, `GET /api/inventory-with-history`, `GET /api/inventory/:id` | `requireSupervisorPlus` |
| `POST /api/inventory`, `PATCH /api/inventory/:id`, `DELETE /api/inventory/:id` | `requireSupervisorPlus` |
| `POST /api/inventory/clear` | `requireSuperUser` |
| `GET /api/stats` | `requireSupervisorPlus` |
| `GET /api/alerts`, `POST /api/alerts/:id/dismiss`, `POST /api/alerts/dismiss-all` | `requireSupervisorPlus` |
| `GET /api/prompts`, `POST /api/prompts`, `PATCH /api/prompts/:id`, `DELETE /api/prompts/:id`, `POST /api/prompts/:id/set-default` | `requireProgrammerPlus` |
| `GET /api/training-examples`, `POST /api/training-examples`, `PATCH /api/training-examples/:id`, `DELETE /api/training-examples/:id` | `requireProgrammerPlus` |
| `GET /api/settings`, `POST /api/settings` | `requireSuperUser` |
| `GET /api/analysis/summary`, `GET /api/analysis` | `requireProgrammerPlus` |
| `GET /api/analysis/:id` | `requireAuth(['operator', 'supervisor', 'programmer', 'superuser'])` |
| `DELETE /api/analysis/:id` | `requireAuth(['operator', 'supervisor', 'superuser'])` |
| `POST /api/analyze` | `requireAnyRole` |
| `GET /api/models` | `requireAnyRole` |
| `GET /api/health` | Public (no auth) |

---

## 7. Frontend Route Protection

### Updated `App.tsx` Route Table

```tsx
<Route path="/login" component={Login} />  {/* outside sidebar layout */}
<Route path="/">
  <ProtectedRoute component={Dashboard} allowedRoles={['supervisor', 'superuser']} />
</Route>
<Route path="/upload">
  <ProtectedRoute component={Upload} allowedRoles={['operator', 'superuser']} />
</Route>
<Route path="/my-uploads">
  <ProtectedRoute component={MyUploads} allowedRoles={['operator', 'superuser']} />
</Route>
<Route path="/inventory">
  <ProtectedRoute component={Inventory} allowedRoles={['supervisor', 'superuser']} />
</Route>
<Route path="/reports">
  <ProtectedRoute component={Reports} allowedRoles={['supervisor', 'superuser']} />
</Route>
<Route path="/alerts">
  <ProtectedRoute component={Alerts} allowedRoles={['supervisor', 'superuser']} />
</Route>
<Route path="/prompts">
  <ProtectedRoute component={Prompts} allowedRoles={['programmer', 'superuser']} />
</Route>
<Route path="/training-examples">
  <ProtectedRoute component={TrainingExamples} allowedRoles={['programmer', 'superuser']} />
</Route>
<Route path="/evaluation">
  <ProtectedRoute component={Evaluation} allowedRoles={['programmer', 'superuser']} />
</Route>
<Route path="/settings">
  <ProtectedRoute component={Settings} allowedRoles={['superuser']} />
</Route>
```

### 403 ForbiddenPage (inline component)

```tsx
function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <ShieldX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Access Denied</h1>
      <p className="text-muted-foreground max-w-sm">
        Your role does not have permission to access this page.
      </p>
    </div>
  );
}
```

---

## 8. Test Plan

### 8.1 Authentication Tests

**AT-01: Successful login — each role**
- For each role: POST `/api/auth/login` with correct password → assert 200 `{ role }`.
- GET `/api/auth/me` → assert 200 `{ role }`.

**AT-02: Wrong password**
- POST `/api/auth/login` with wrong password → assert 401.
- GET `/api/auth/me` → assert 401 (no session set).

**AT-03: Invalid role string**
- POST `/api/auth/login` with `{ role: 'admin', password: 'x' }` → assert 400.

**AT-04: Login page UI — role selector**
- All four role options visible.
- Password field is masked.
- Operator login → redirect to `/upload`.
- Supervisor login → redirect to `/`.
- Programmer login → redirect to `/prompts`.
- SuperUser login → redirect to `/`.

**AT-05: Wrong password UI feedback**
- Inline error message appears, no redirect, no session created.

**AT-06: Logout**
- POST `/api/auth/logout` → 200.
- GET `/api/auth/me` → 401.
- Navigate to protected page → redirect to `/login`.

**AT-07: Session persistence across page refreshes**
- Login as Supervisor, hard-refresh → no redirect to `/login`, sidebar shows Supervisor nav.

**AT-08: Session expiry**
- After session maxAge elapses, GET `/api/auth/me` → 401, frontend redirects to `/login`.

**AT-09: Missing env var for role**
- Unset `ROLE_OPERATOR_PASSWORD`, attempt login as Operator → assert 500 "Role not configured".

---

### 8.2 Operator Role Tests

**OP-01: Navigation restricted to Upload only**
- Sidebar shows only "Upload".
- Direct navigation to `/inventory` → 403 page.
- Direct navigation to `/` → 403 page.

**OP-02: Upload form renders correctly**
- Photo date input present and pre-filled with today's date.
- Model selector present.
- Upload zone and "Take Photo" button present.

**OP-03: Quality feedback — good image**
- Upload image with average confidence >= 70%, no "cut off" keywords in description.
- Clarity badge: green "Clear".
- Coverage badge: green "Good coverage".
- Overall badge: green "Good".
- Message: "Image looks great. Results saved to inventory."
- Detected items list is read-only.
- No Retake button shown.

**OP-04: Quality feedback — blurry image**
- Average confidence = 55% → amber "Blurry" clarity badge.
- Overall badge: amber "Fair" or red "Poor".
- Retake button shown.
- Click Retake → results clear, upload form resets.

**OP-05: Quality feedback — items cut off**
- Description contains "cut off" → amber "Some items may be cut off" coverage badge.

**OP-06: Operator cannot access restricted API routes**
- GET `/api/inventory` → 403.
- GET `/api/stats` → 403.
- GET `/api/prompts` → 403.
- GET `/api/settings` → 403.

**OP-07: Operator CAN call POST /api/analyze**
- POST `/api/analyze` with valid image → 200.
- Analysis result saved with `isTest=0`.
- Inventory items created/updated.

**OP-08: My Uploads page**
- Login as Operator.
- Upload two images → both IDs stored in sessionStorage.
- Navigate to `/my-uploads`.
- Assert both uploads appear as cards with thumbnails, timestamps, and quality badges.
- Click Delete on one → confirmation dialog appears → confirm → card disappears.
- Refresh page → remaining upload still shown (sessionStorage persists across refresh).
- Logout → login again → `/my-uploads` page is empty (sessionStorage cleared on logout).

**OP-09: Mobile layout**
- 375px viewport: buttons are `h-14` (56px), text is minimum `text-base`.

---

### 8.3 Supervisor Role Tests

**SV-01: Navigation shows correct pages**
- Dashboard, Inventory, Reports, Alerts visible.
- No Upload, Prompts, Training, Evaluation, Settings links.

**SV-02: Dashboard access**
- GET `/api/stats` → 200. Dashboard renders.

**SV-03: Verify count**
- Count row has "Verify" button.
- Click → POST `/api/inventory/:itemId/counts/:photoDate/verify` → 200 with non-null `verifiedAt`.
- UI shows green "Verified" badge with left green border accent.

**SV-04: Verify count idempotency**
- Verify an already-verified count → 200 (updates `verifiedAt` again, no error).

**SV-05: Merge items — success**
- Dialog opens, source + target selectable, canonical name editable.
- Confirm → POST `/api/inventory/merge` → 200.
- Source item gone from inventory list, target renamed to canonical name.

**SV-06: Merge items — conflict resolution options shown when dates overlap**
- Source has count on date D, Target also has count on date D.
- Assert the "On date conflict, keep:" radio group is visible in the dialog.
- If items have no overlapping dates: assert the radio group is hidden.

**SV-06a: Conflict resolution = 'max' (default)**
- Source count 15 on D, Target count 20 on D, conflictResolution='max'.
- After merge: Target count for D = 20. Source deleted.

**SV-06b: Conflict resolution = 'source'**
- Source count 15 on D, Target count 20 on D, conflictResolution='source'.
- After merge: Target count for D = 15. Source deleted.

**SV-06c: Conflict resolution = 'target'**
- Source count 15 on D, Target count 20 on D, conflictResolution='target'.
- After merge: Target count for D = 20 (unchanged). Source deleted.

**SV-07: Merge items — only source count on a date**
- Source has count 10 on date D, Target has no count for D.
- After merge: Target gains count 10 for D.

**SV-08: Merge items — same item**
- sourceId === targetId → assert 400.

**SV-09: Supervisor cannot access restricted pages/routes**
- GET `/api/prompts` → 403.
- GET `/api/settings` → 403.
- Navigate to `/prompts` → 403 page.
- Navigate to `/upload` → 403 page.

**SV-10: Alerts dismissal**
- GET `/api/alerts` → 200.
- POST `/api/alerts/:id/dismiss` → 200.

---

### 8.4 Programmer Role Tests

**PG-01: Navigation shows correct pages**
- AI Prompts, Training Examples, Evaluation visible.
- Testing Mode toggle visible in sidebar.
- No Dashboard, Inventory, Reports, Alerts, Settings.

**PG-02: Default landing page**
- Login → redirect to `/prompts`.

**PG-03: Testing Mode — toggle ON**
- POST `/api/auth/testing-mode` `{ enabled: true }` → 200.
- Amber banner appears in header.
- Sidebar toggle shows amber.
- Refresh page → testing mode persists (session survives refresh).
- Logout + login again → testing mode resets to OFF.

**PG-04: Testing Mode — toggle OFF**
- POST `/api/auth/testing-mode` `{ enabled: false }` → amber banner disappears.

**PG-05: Testing Mode — analyze does not save to inventory**
- Testing mode ON, POST `/api/analyze` with valid image.
- Response contains `testMode: true`.
- No new inventory_items created.
- analysis_results row has `is_test = 1`.

**PG-06: Real mode — analyze saves isTest=0**
- Testing mode OFF, POST `/api/analyze`.
- analysis_results row has `is_test = 0`.

**PG-07: Prompts CRUD**
- GET/POST/PATCH/DELETE `/api/prompts` all → 200.
- POST `/api/prompts/:id/set-default` → 200.

**PG-08: Training Examples CRUD**
- GET/POST/PATCH/DELETE `/api/training-examples` all → 200.

**PG-09: Evaluation — run inference with uploaded image**
- Select prompt + model, attach image, click Run Inference.
- POST `/api/evaluate` called → results panel renders with detected items, confidence, description.
- "Save as Training Example" button visible per item.

**PG-10: Evaluation — run inference with existing image**
- Gallery loads from GET `/api/analysis/summary`.
- Select existing image, run inference.
- POST `/api/evaluate` called with `{ analysisId, promptId, modelId }`.

**PG-11: Save as Training Example from Evaluation**
- Click "Save as Training Example" → dialog pre-filled.
- Save → POST `/api/training-examples` → success toast.

**PG-12: Side-by-side comparison**
- Run inference twice with different params.
- "Compare with previous run" toggle appears, enabling it shows both panels side-by-side.

**PG-13: Programmer cannot access restricted routes**
- GET `/api/inventory` → 403.
- GET `/api/stats` → 403.
- GET `/api/settings` → 403.
- POST `/api/inventory/merge` → 403.
- POST `/api/inventory/:id/counts/:date/verify` → 403.

**PG-14: POST /api/evaluate always skips inventory regardless of testing mode**
- Testing mode OFF, POST `/api/evaluate` → no inventory items created, `is_test = 1` on result.

---

### 8.5 SuperUser Role Tests

**SU-01: All pages accessible**
- Dashboard, Upload, Inventory, Reports, Alerts, Prompts, Training, Evaluation, Settings all visible in sidebar.
- Testing Mode toggle visible.

**SU-02: All Supervisor features work**
- Verify count → 200.
- Merge items → 200.

**SU-03: All Programmer features work**
- Toggle Testing Mode → 200.
- Prompts CRUD → 200.
- Evaluation page → renders and works.

**SU-04: Settings access**
- GET `/api/settings` → 200.
- POST `/api/settings` → 200.

**SU-05: Upload page shows full raw results (not Operator quality feedback panel)**
- Navigate to `/upload`, upload image.
- Results display the existing full raw results view, not the quality feedback card.

**SU-06: isTest results excluded from stats**
- Create isTest=1 results via `/api/evaluate`.
- GET `/api/stats` → `totalScans` does not count isTest=1 rows.

---

### 8.6 Cross-Role and Security Tests

**CR-01: Session is server-side only**
- Sessions stored in MemoryStore; cookie contains only session ID.
- A crafted cookie cannot grant elevated privileges.
- POST `/api/inventory/merge` as Operator → 403.

**CR-02: Unauthenticated requests — all protected routes return 401**
- Without a session cookie: GET `/api/inventory`, `/api/stats`, `/api/prompts`, `/api/training-examples`, `/api/settings`, POST `/api/analyze`, POST `/api/evaluate`, POST `/api/inventory/merge`, POST `/api/settings/testing-mode` → all 401.

**CR-03: Session isolation between roles**
- Operator session in Browser A, Supervisor in Browser B.
- POST `/api/settings/testing-mode` as Supervisor → 403.
- Both sessions remain valid after the failed request.

**CR-04: Operator cannot set Testing Mode**
- POST `/api/settings/testing-mode` as Operator → 403.

**CR-05: Supervisor cannot call POST /api/evaluate**
- POST `/api/evaluate` as Supervisor → 403.

**CR-06: Programmer cannot call POST /api/inventory/merge**
- POST `/api/inventory/merge` as Programmer → 403.

**CR-07: Testing Mode is per-session, does not affect other users**
- Programmer (Browser A) enables Testing Mode.
- Operator (Browser B) uploads via POST `/api/analyze` → response does NOT contain `testMode: true` (Operator's session is unaffected).
- SuperUser (Browser C) uploads → also unaffected, always saves to inventory.
- Programmer logs out → Testing Mode resets to OFF for next login.

**CR-07b: SuperUser cannot toggle Testing Mode**
- Login as SuperUser, POST `/api/auth/testing-mode` → assert 403.
- SuperUser's uploads always go to real inventory regardless.

**CR-13: Operator delete image — removes analysis result and count**
- Operator uploads an image → receives analysisResult.id in response.
- DELETE `/api/analysis/:id` as Operator → 200.
- The analysis_results row no longer exists.
- The inventory_item_counts row linked via sourceAnalysisId no longer exists.
- The inventory item's currentCount is recalculated (decremented or zeroed).

**CR-14: Supervisor delete image**
- Supervisor calls DELETE `/api/analysis/:id` on any existing analysis result → 200.
- Same cascade behavior as CR-13.

**CR-15: Programmer cannot delete analysis results**
- Login as Programmer, DELETE `/api/analysis/:id` → 403.

**CR-16: Delete non-existent analysis result**
- DELETE `/api/analysis/nonexistent-id` → 404.

**CR-08: Logout clears TanStack Query cache**
- Login as Supervisor, fetch inventory.
- Logout → `queryClient.clear()` called.
- Login as Operator → no stale Supervisor data visible.

**CR-09: Direct URL access without authentication**
- No session, navigate to `/inventory` → redirect to `/login`.

**CR-10: Authenticated wrong-role page access**
- Login as Operator, navigate to `/inventory` → 403 ForbiddenPage renders with "Access Denied" heading.
- Logout button still accessible.

**CR-11: isTest results do not appear in inventory flows**
- isTest=1 analysis results are excluded from inventory count history and stats.
- GET `/api/inventory-with-history` as Supervisor → no counts derived from isTest=1 rows.

**CR-12: Merge reassigns all analysis results**
- Item A has 3 analysis_results, Item B has 2.
- Merge A→B → all 5 analysis_results reference Item B.
- Item A no longer exists.

---

## 9. Implementation Sequencing

1. **Phase 1 — Auth backbone**: Session middleware in `server/index.ts`, auth routes + `requireAuth` in `server/routes.ts`, `AuthContext`, `ProtectedRoute`, Login page, `App.tsx` restructure. Apply `requireAnyRole` to all existing routes as a placeholder.

2. **Phase 2 — DB schema**: Add `isTest` to `analysis_results`, `verifiedAt` to `inventory_item_counts`. Run `npm run db:push`. Update `IStorage` and `DatabaseStorage`.

3. **Phase 3 — Operator UX**: Image Quality Feedback panel, "Take Photo" button, mobile styling adjustments.

4. **Phase 4 — Supervisor UX**: Verify button + API, Merge Items dialog + API, verified row styling. Apply correct per-route middleware.

5. **Phase 5 — Programmer UX**: Testing Mode toggle + banner + API, testing mode gate in `POST /api/analyze`, Evaluation page + `POST /api/evaluate`.

6. **Phase 6 — Sidebar role-filtering**: Replace static `menuItems` with role-aware map in `AppSidebar.tsx`. Verify all per-role sidebar views.

7. **Phase 7 — Hardening**: Replace `requireAnyRole` placeholders with correct per-route middleware per the permissions matrix. Run full cross-role test suite.
