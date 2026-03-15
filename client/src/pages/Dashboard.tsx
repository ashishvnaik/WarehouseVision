import { useState } from "react";
import { Package, AlertTriangle, CalendarDays, ArrowUp, ArrowDown, ArrowUpDown, Image as ImageIcon, Info, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { InventoryItem, InventoryItemCount } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface CountWithMethod extends InventoryItemCount {
  countingMethod?: string;
}

interface ItemWithHistory extends InventoryItem {
  countHistory: CountWithMethod[];
}

const MAX_DATES = 3;

type SortDir = "asc" | "desc";

export default function Dashboard() {
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: items = [], isLoading } = useQuery<ItemWithHistory[]>({
    queryKey: ["/api/inventory-with-history"],
    staleTime: 0,
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalItems = items.length;

  const allDates = Array.from(
    new Set(items.flatMap((i) => i.countHistory.map((c) => c.photoDate)))
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const recentDates = allDates.slice(-MAX_DATES);

  const lastUpdated = allDates.length > 0 ? allDates[allDates.length - 1] : null;

  const lowStockItems = items.filter(
    (i) => i.currentCount > 0 && i.currentCount < i.minThreshold
  ).length;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCount = (item: ItemWithHistory, date: string): number | null => {
    const e = item.countHistory.find((c) => c.photoDate === date);
    return e != null ? e.absoluteCount : null;
  };

  const getEntry = (item: ItemWithHistory, date: string): CountWithMethod | null =>
    item.countHistory.find((c) => c.photoDate === date) ?? null;

  const getDelta = (item: ItemWithHistory, date: string, dateIndex: number): number | null => {
    if (dateIndex === 0) return null;
    const cur = getCount(item, date);
    if (cur === null) return null;
    for (let i = dateIndex - 1; i >= 0; i--) {
      const prev = getCount(item, recentDates[i]);
      if (prev !== null) return cur - prev;
    }
    return null;
  };

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (sortColumn === "name") {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    }
    const aCount = getCount(a, sortColumn) ?? -1;
    const bCount = getCount(b, sortColumn) ?? -1;
    return sortDir === "asc" ? aCount - bCount : bCount - aCount;
  });

  function SortIcon({ col }: { col: string }) {
    if (sortColumn !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Inventory overview</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="p-2 rounded-md bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Items Tracked</p>
            <p className="text-2xl font-semibold">{isLoading ? "—" : totalItems}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="p-2 rounded-md bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "—"
                : lastUpdated
                  ? format(parseISO(lastUpdated), "MMM d, yyyy")
                  : "No data"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="p-2 rounded-md bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="text-2xl font-semibold">{isLoading ? "—" : lowStockItems}</p>
          </div>
        </div>
      </div>

      {/* ── Inventory table ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading inventory…</div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No inventory items yet. Upload and analyze warehouse images to get started.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 w-14">Image</TableHead>
                <TableHead
                  className="sticky left-14 bg-background z-10 min-w-[150px] cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Item Name <SortIcon col="name" />
                </TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                {recentDates.map((date) => (
                  <TableHead
                    key={date}
                    className="min-w-[130px] text-center cursor-pointer select-none"
                    onClick={() => handleSort(date)}
                  >
                    {format(parseISO(date), "MMM d, yyyy")}
                    <SortIcon col={date} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="sticky left-14 bg-background z-10 font-medium">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    {item.currentCount === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : item.currentCount < item.minThreshold ? (
                      <Badge className="bg-chart-4 text-white hover:bg-chart-4/90">Low Stock</Badge>
                    ) : (
                      <Badge className="bg-chart-5 text-white hover:bg-chart-5/90">In Stock</Badge>
                    )}
                  </TableCell>
                  {recentDates.map((date, dateIndex) => {
                    const count = getCount(item, date);
                    const delta = getDelta(item, date, dateIndex);
                    const entry = getEntry(item, date);

                    return (
                      <TableCell key={date} className="text-center">
                        {count !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 justify-center">
                              <span className="font-mono font-medium text-lg flex items-center gap-1">
                                {count}
                                {entry?.sourceAnalysisId && (
                                  <ImageIcon className="h-3 w-3 opacity-40" />
                                )}
                              </span>
                              {entry?.countingMethod && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-muted-foreground cursor-default">
                                      <Info className="h-3 w-3" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-sm font-normal">{entry.countingMethod}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {entry?.verifiedAt && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-chart-5">
                                      <ShieldCheck className="h-3 w-3" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-sm">Verified {format(new Date(entry.verifiedAt), "MMM d, yyyy")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {delta !== null && delta !== 0 && (
                              <div className={`flex items-center gap-0.5 text-xs ${delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                <span>{delta > 0 ? `+${delta}` : delta}</span>
                              </div>
                            )}
                            {delta === 0 && <span className="text-xs text-muted-foreground">no change</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
