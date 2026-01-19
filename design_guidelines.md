# Warehouse Inventory Tracking System - Design Guidelines

## Design Approach

**Selected Approach**: Design System + Modern Dashboard Patterns

Drawing inspiration from Linear's clean productivity interface, Notion's data organization, and modern analytics dashboards. This approach prioritizes information density, quick scanning, and efficient workflows while maintaining visual clarity.

**Core Principles**:
- Data clarity over decoration
- Scannable information hierarchy
- Quick access to critical alerts
- Seamless image/video integration
- Progressive disclosure of complexity

---

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts) - exceptional readability for data-heavy interfaces
- Monospace: JetBrains Mono - for numerical data, counts, timestamps

**Hierarchy**:
- Page Titles: text-3xl, font-semibold, tracking-tight
- Section Headers: text-xl, font-semibold
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Data Labels: text-sm, font-medium, uppercase tracking-wide
- Numerical Data: text-2xl, font-bold (monospace)
- Metadata/Timestamps: text-xs, font-normal
- Alert Text: text-sm, font-medium

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, and 16
- Micro spacing (elements within cards): p-4, gap-2
- Component spacing: p-6, gap-4
- Section spacing: p-8, gap-6
- Major layout divisions: p-16

**Grid System**:
- Dashboard: 12-column grid with responsive breakpoints
- Sidebar: Fixed 64px collapsed / 256px expanded
- Main content: Fluid with max-w-7xl container
- Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

---

## Component Library

### Navigation Structure

**Top Bar** (h-16, fixed):
- Logo + app name (left)
- Global search bar (center, max-w-md)
- Notification bell with badge, user avatar (right)
- Subtle border-b separator

**Sidebar Navigation** (collapsible):
- Dashboard (home icon)
- Live Feed (camera icon)
- Inventory (package icon)
- Reports (chart icon)
- Alerts (bell icon)
- Settings (gear icon)
- Active state: subtle background fill, border-l accent
- Collapsed state shows icons only

### Dashboard Layout

**Stats Overview Row** (top of dashboard):
- 4 metric cards in grid-cols-4
- Each card: icon, large number, label, trend indicator
- Examples: "Total Items", "Low Stock Items", "Packages Tracked Today", "Active Cameras"
- Card structure: p-6, rounded-lg, border, hover:shadow transition

**Main Content Grid** (3-column layout on desktop):
- Left Column (col-span-2): Live feed preview + recent activity
- Right Column (col-span-1): Alerts sidebar + quick actions

### Core Components

**Alert Cards**:
- Stacked list with gap-2
- Each alert: p-4, rounded-md, border-l-4 (severity indicator)
- Icon + Item name + Current count + Threshold
- Dismiss button (top-right)
- Severity levels: Critical, Warning, Info

**Inventory Table**:
- Full-width with sticky header
- Columns: Image thumbnail, Item ID, Name, Location, Current Count, Status, Last Updated, Actions
- Row height: h-16 with vertical centering
- Alternating subtle row backgrounds for scannability
- Sortable headers with directional icons
- Inline edit capability for count adjustments

**Live Feed Viewer**:
- Aspect ratio container (16:9)
- Camera selector dropdown (if multiple feeds)
- Playback controls for recorded footage
- Capture/analyze button overlay
- Processing indicator during analysis
- Results overlay with bounding boxes and counts

**Report Cards**:
- Compact visualization cards
- Chart.js integration for: Bar charts (inventory levels), Line graphs (trends over time), Pie charts (category distribution)
- Card header: title + date range selector + export button
- Card body: p-6 with responsive chart

**Data Upload Zone**:
- Dashed border drag-and-drop area
- Upload icon + "Drop images/videos here"
- File type indicators (JPG, PNG, MP4, MOV)
- Progress bars during upload
- Thumbnail preview grid after upload

**Modal Dialogs**:
- Backdrop: semi-transparent overlay
- Container: max-w-2xl, rounded-lg, p-6
- Header: text-xl font-semibold + close button
- Body: scrollable if needed, max-h-96
- Footer: action buttons aligned right

### Form Elements

**Input Fields**:
- Height: h-10
- Padding: px-4
- Border: border rounded-md
- Focus: ring-2 ring-offset-2
- Labels: text-sm font-medium, mb-2

**Buttons**:
- Primary: px-4 py-2, rounded-md, font-medium
- Secondary: border variant
- Icon buttons: w-10 h-10, rounded-full
- Loading state: spinner icon replacement

**Dropdowns/Selects**:
- Same height as inputs (h-10)
- Chevron down icon (right aligned)
- Dropdown menu: rounded-lg, shadow-lg, border

---

## Specialized Patterns

**Image Grid Display** (for analysis results):
- Masonry grid or uniform grid-cols-3
- Each image: rounded-lg, overflow-hidden
- Overlay on hover: detection confidence, item count
- Click to expand with detailed annotations

**Timeline View** (activity monitoring):
- Vertical timeline with connector lines
- Timestamp + event type + details
- Grouped by day with date headers

**Comparison View** (before/after analysis):
- Side-by-side image panels
- Synchronized zoom/pan
- Difference highlighting

---

## Responsive Behavior

**Desktop (lg: 1024px+)**:
- Full sidebar expanded by default
- 4-column metric cards
- 3-column main layout
- Side-by-side comparison views

**Tablet (md: 768px)**:
- Sidebar collapsed to icons
- 2-column metric cards
- 2-column main layout
- Stacked comparison views

**Mobile (base)**:
- Bottom navigation bar (5 key items)
- Single column throughout
- Swipeable cards
- Full-width tables with horizontal scroll

---

## Accessibility Standards

- All interactive elements: min-height h-10 (touch targets)
- Form inputs: clear labels, helper text, error states
- Icons: paired with text labels or aria-labels
- Keyboard navigation: visible focus states
- Screen reader: semantic HTML, ARIA landmarks
- Tables: proper thead/tbody structure, scope attributes

---

## Images

**Hero/Dashboard Header**: No traditional hero image. Instead, use a compact stats banner with subtle gradient background treatment.

**Live Feed Section**: Actual camera feed images (16:9 aspect ratio containers) with camera identifier overlays.

**Inventory Table**: Small thumbnail images (64x64px, rounded) showing items, with fallback placeholder icons.

**Report Visualizations**: Chart-generated graphics, no static images needed.

**Empty States**: Simple illustration placeholders (via icon libraries) for "No alerts", "No data", "Upload first image" states.