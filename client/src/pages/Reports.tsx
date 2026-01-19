import { InventoryChart } from "@/components/InventoryChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface Stats {
  totalItems: number;
  totalItemTypes: number;
  lowStockItems: number;
  outOfStockItems: number;
  activeAlerts: number;
  totalScans: number;
}

export default function Reports() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  const weeklyData = [
    { name: 'Mon', count: 45 },
    { name: 'Tue', count: 52 },
    { name: 'Wed', count: 38 },
    { name: 'Thu', count: 61 },
    { name: 'Fri', count: 48 },
    { name: 'Sat', count: 35 },
    { name: 'Sun', count: 42 },
  ];

  const categoryData = [
    { name: 'Pallets', count: 234 },
    { name: 'Boxes', count: 567 },
    { name: 'Containers', count: 189 },
    { name: 'Crates', count: 345 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Reports</h1>
          <p className="text-muted-foreground">Analytics and inventory insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="7days">
            <SelectTrigger className="w-40" data-testid="select-date-range">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Total Scans
          </p>
          <p className="text-2xl font-bold font-mono">{stats?.totalScans || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">All-time total</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Item Categories
          </p>
          <p className="text-2xl font-bold font-mono">{stats?.totalItemTypes || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Active categories</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Items Tracked
          </p>
          <p className="text-2xl font-bold font-mono">{stats?.totalItems || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Current inventory</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryChart title="Daily Activity" data={weeklyData} />
        <InventoryChart title="Items by Category" data={categoryData} />
      </div>
    </div>
  );
}
