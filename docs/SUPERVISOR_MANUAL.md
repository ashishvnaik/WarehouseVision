# WarehouseVision — Supervisor Manual

**Role:** Supervisor
**Version:** 1.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Inventory](#3-managing-inventory)
   - 3.1 [Verifying Counts](#31-verifying-counts)
   - 3.2 [Merging Items](#32-merging-items)
   - 3.3 [Editing Counts](#33-editing-counts)
   - 3.4 [Deleting an Analysis Image](#34-deleting-an-analysis-image)
   - 3.5 [Deleting an Item Entirely](#35-deleting-an-item-entirely)
4. [Managing Alerts](#4-managing-alerts)
5. [Reports and Analytics](#5-reports-and-analytics)

---

## 1. Getting Started

WarehouseVision gives Supervisors oversight of all inventory data produced by Operator uploads. Your role is to review AI-generated counts, confirm their accuracy, manage the inventory database, and respond to stock alerts.

### Logging In

1. Open WarehouseVision in your browser.
2. On the login page, select **Supervisor** from the role selector.
3. Enter your Supervisor password and click **Log In**.
4. You will land on the **Dashboard** — your central overview of inventory status.

### Pages Available to You

| Page | Purpose |
|------|---------|
| Dashboard | At-a-glance inventory stats, recent activity, and active alerts |
| Inventory | Full count history table with verification and management tools |
| Reports | Analytics charts with date range filtering |
| Alerts | Full list of low-stock and out-of-stock alerts |

---

## 2. Dashboard Overview

The Dashboard is your landing page and gives you an immediate snapshot of the current state of inventory.

### Stats Cards

Four summary cards appear at the top of the Dashboard:

- **Total Items** — The total number of distinct inventory items being tracked.
- **Low Stock** — The number of items currently below their stock threshold.
- **Packages Tracked** — The total package count across all tracked items.
- **Item Types** — The number of distinct item categories in the system.

Use these cards to quickly assess whether inventory levels are healthy before diving into detail.

### Weekly Inventory Chart

A chart below the stats cards displays inventory levels over the past week. Use this to spot trends at a glance — for example, a steady decline in a particular item category may indicate it needs reordering soon.

### Latest Analysis Image

The Dashboard shows the most recently uploaded analysis image along with its detection results. This lets you quickly confirm that Operators are uploading photos and that the AI is returning sensible results.

### Active Alerts

A summary of current active alerts is displayed on the Dashboard. Click through to the Alerts page to manage them in full.

---

## 3. Managing Inventory

The **Inventory page** is where you review and manage all AI-detected counts. It presents a date-based count history table: each row represents an inventory item, and each column represents a date on which that item was counted. Individual cells show the count for that item on that date, along with delta indicators showing whether the count went up or down compared to the previous count.

### Searching the Inventory

Use the **search bar** at the top of the Inventory page to filter rows by item name or SKU. This is useful when you are looking for a specific product in a large inventory.

---

### 3.1 Verifying Counts

AI-generated counts should be reviewed and confirmed by a Supervisor before they are treated as authoritative. Each count cell has a **Verify** button for this purpose.

**To verify a count:**

1. Navigate to the **Inventory page**.
2. Find the item and date you want to verify.
3. Click the **Verify** button in the relevant cell.
4. The cell will display a green **"Verified"** badge, indicating a human has confirmed the count.

**Best practice:** Verify counts promptly after Operators complete their uploads. Verified counts provide a reliable audit trail and help distinguish human-confirmed data from raw AI output.

---

### 3.2 Merging Items

The AI may occasionally detect the same physical product under slightly different names — for example, "Cardboard Box (Large)" and "Large Cardboard Box". The **Merge Items** feature lets you consolidate these into a single canonical item.

**To merge two items:**

1. On the **Inventory page**, click the **"Merge Items"** button in the page header. A dialog box will open.
2. **Select the source item** — this is the item you want to remove. Its counts and analyses will be reassigned.
3. **Select the target item** — this is the item you want to keep.
4. **Edit the canonical name** if needed — this will be the final name of the merged item.
5. If both items have counts recorded on the same date, you must choose a **conflict resolution method**:
   - **Source count** — use the count from the source item for that date.
   - **Target count** — use the count from the target item for that date.
   - **Larger of the two** (default) — use whichever count is higher. This is the safest choice when you are not certain which reading was more accurate.
6. Click **Merge**. The source item is removed from the inventory, and all of its historical counts and analysis records are transferred to the target item.

> **Caution:** Merging cannot be undone. Review both items carefully before confirming, and choose the conflict resolution method that best reflects physical reality.

---

### 3.3 Editing Counts

If a count value is known to be incorrect — for example, if a recount was performed manually — you can edit it directly.

**To edit a count:**

1. On the **Inventory page**, locate the cell you want to change.
2. Click the **edit count** button for that cell.
3. Enter the correct value inline.
4. Confirm the change.

Edited counts are reflected immediately in the inventory history. Consider verifying the corrected cell afterwards to indicate that a human has reviewed it.

---

### 3.4 Deleting an Analysis Image

If an Operator uploaded an image that produced incorrect results — for instance, the wrong area of the warehouse was photographed — you can remove that specific analysis and its associated count from the database without deleting the item itself.

**To delete an analysis image:**

1. On the **Inventory page**, find the count cell associated with the problematic upload.
2. Click the **trash icon** (Delete Image) on that cell.
3. The analysis result and its count are removed. The item remains in the inventory.

> **Note:** Operators can also delete their own uploads from the Upload page or the My Uploads page during their session. If an Operator has already done so, no further action is needed.

---

### 3.5 Deleting an Item Entirely

If an item should no longer be tracked at all — for example, a product line has been discontinued — you can remove it from the inventory entirely.

**To delete an item:**

1. On the **Inventory page**, locate the item row.
2. Click the **delete item** button for that row.
3. Confirm the deletion. The item and all of its historical count data are permanently removed.

> **Caution:** This action is permanent and removes all historical count data for the item. Use this only when you are certain the item should no longer exist in the system.

---

## 4. Managing Alerts

The **Alerts page** shows all active stock alerts generated by the system. Alerts are raised automatically when item counts fall below defined thresholds.

### Alert Severity Levels

| Level | Colour | Meaning |
|-------|--------|---------|
| Critical | Red | Item is out of stock (count is zero or below minimum) |
| Warning | Amber | Item is low in stock (approaching the minimum threshold) |
| Info | Blue | Other noteworthy inventory events |

### Viewing Alerts

Use the **tab filters** at the top of the Alerts page to view a subset of alerts:

- **All** — Shows every active alert regardless of severity.
- **Critical** — Shows only out-of-stock alerts.
- **Warning** — Shows only low-stock alerts.
- **Info** — Shows only informational alerts.

### Dismissing Alerts

Once you have taken action on a stock issue (for example, placed a reorder), you should dismiss the alert to keep the list clean and meaningful.

- To dismiss a single alert, click the **Dismiss** button on that alert.
- To clear all alerts at once, use the **Dismiss All** button.

> **Best practice:** Only dismiss an alert after you have actually taken the corresponding action (such as reordering stock). Dismissing alerts without acting on them defeats the purpose of the alerting system.

### Monitoring Alerts from the Dashboard

The Dashboard also shows a summary of active alerts. For quick day-to-day monitoring, you can review alerts from there and only navigate to the full Alerts page when you need to dismiss them or see full details.

---

## 5. Reports and Analytics

The **Reports page** provides trend analysis and historical charts to help you understand inventory movement over time.

### Date Range Selector

Use the **date range selector** at the top of the Reports page to define the period you want to analyse. You can review data for a specific week, month, quarter, or any custom date range.

### Charts and Analytics

The Reports page displays charts that visualise inventory data over your chosen period. Use these charts to:

- Identify items whose counts are consistently declining (potential reorder candidates).
- Spot anomalies — a sudden spike or drop in counts may indicate an upload error or a real-world event worth investigating.
- Review overall inventory trends to support purchasing and staffing decisions.

### Tips for Effective Reporting

- Run regular weekly or monthly reports to stay ahead of stock shortfalls.
- If a chart shows unexpected data, cross-reference with the Inventory page to check whether the counts for that period have been verified.
- Use trend data alongside alert history to build a complete picture of stock management performance.

---

*For system configuration, prompt tuning, or AI model questions, contact your Programmer.*
