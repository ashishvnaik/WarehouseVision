import { StatsCard } from "@/components/StatsCard";
import { AlertCard } from "@/components/AlertCard";
import { InventoryChart } from "@/components/InventoryChart";
import { ImageAnnotationViewer } from "@/components/ImageAnnotationViewer";
import { Package, AlertTriangle, Camera, TrendingUp } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InventoryItem, Alert, AnalysisResult } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface AlertWithItem extends Alert {
  itemName: string;
  currentCount: number;
  threshold: number;
}

interface Stats {
  totalItems: number;
  totalItemTypes: number;
  lowStockItems: number;
  outOfStockItems: number;
  activeAlerts: number;
  totalScans: number;
}

export default function Dashboard() {
  const { data: alerts = [] } = useQuery<AlertWithItem[]>({
    queryKey: ['/api/alerts'],
    staleTime: 0,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['/api/stats'],
    staleTime: 0,
  });

  // Use lightweight summary endpoint to avoid loading large base64 images
  const { data: analysisResults = [] } = useQuery<Omit<AnalysisResult, 'imageUrl'>[]>({
    queryKey: ['/api/analysis/summary'],
    staleTime: 0,
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
    staleTime: 0,
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/alerts/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const handleDismissAlert = (id: string) => {
    dismissAlertMutation.mutate(id);
  };

  const mockChartData = [
    { name: 'Mon', count: 45 },
    { name: 'Tue', count: 52 },
    { name: 'Wed', count: 38 },
    { name: 'Thu', count: 61 },
    { name: 'Fri', count: 48 },
    { name: 'Sat', count: 35 },
    { name: 'Sun', count: 42 },
  ];

  const activeAlerts = alerts.filter(a => !a.dismissed);

  // Get the most recent analysis result
  const latestAnalysis = [...analysisResults]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Convert analysis results to detections format for display (group by same imageHash)
  const recentDetections = latestAnalysis ? 
    analysisResults
      .filter(r => r.imageHash === latestAnalysis.imageHash)
      .map(result => {
        const item = inventoryItems.find(i => i.id === result.itemId);
        return {
          label: item?.name || 'Unknown Item',
          confidence: result.confidence
        };
      })
    : [];

  const analysisTimestamp = latestAnalysis ? 
    formatDistanceToNow(new Date(latestAnalysis.timestamp), { addSuffix: true }) 
    : undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Dashboard</h1>
        <p className="text-muted-foreground">AI-powered inventory tracking overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Items" 
          value={stats?.totalItems || 0}
          icon={Package}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatsCard 
          title="Low Stock Items" 
          value={stats?.lowStockItems || 0}
          icon={AlertTriangle}
          trend={{ value: 3.2, isPositive: false }}
        />
        <StatsCard 
          title="Packages Tracked" 
          value={stats?.totalScans || 0}
          icon={Camera}
          trend={{ value: 8.1, isPositive: true }}
        />
        <StatsCard 
          title="Item Types" 
          value={stats?.totalItemTypes || 0}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InventoryChart title="Items Tracked This Week" data={mockChartData} />
          
          <ImageAnnotationViewer 
            imageUrl={undefined}
            detections={recentDetections}
            timestamp={analysisTimestamp}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
            <div className="space-y-2">
              {activeAlerts.length > 0 ? (
                activeAlerts.slice(0, 5).map(alert => (
                  <AlertCard 
                    key={alert.id}
                    id={alert.id}
                    itemName={alert.itemName}
                    currentCount={alert.currentCount}
                    threshold={alert.threshold}
                    severity={alert.severity as "critical" | "warning" | "info"}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No active alerts
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
