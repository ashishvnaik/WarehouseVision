import { AlertCard } from "@/components/AlertCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";

interface AlertWithItem extends Alert {
  itemName: string;
  currentCount: number;
  threshold: number;
}

export default function Alerts() {
  const { data: alerts = [], isLoading } = useQuery<AlertWithItem[]>({
    queryKey: ['/api/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts?dismissed=false');
      return response.json();
    },
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

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/alerts/dismiss-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const handleDismissAlert = (id: string) => {
    dismissAlertMutation.mutate(id);
  };

  const handleDismissAll = () => {
    dismissAllMutation.mutate();
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
  const infoAlerts = activeAlerts.filter(a => a.severity === 'info');

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Alerts</h1>
          <p className="text-muted-foreground">Monitor inventory alerts and notifications</p>
        </div>
        {activeAlerts.length > 0 && (
          <Button 
            variant="outline" 
            onClick={handleDismissAll}
            disabled={dismissAllMutation.isPending}
            data-testid="button-dismiss-all"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Dismiss All
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="critical" data-testid="tab-critical">
            Critical ({criticalAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="warning" data-testid="tab-warning">
            Warning ({warningAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="info" data-testid="tab-info">
            Info ({infoAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-2 mt-6">
          {activeAlerts.length > 0 ? (
            activeAlerts.map(alert => (
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
            <p className="text-center text-muted-foreground py-12">No active alerts</p>
          )}
        </TabsContent>

        <TabsContent value="critical" className="space-y-2 mt-6">
          {criticalAlerts.length > 0 ? (
            criticalAlerts.map(alert => (
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
            <p className="text-center text-muted-foreground py-12">No critical alerts</p>
          )}
        </TabsContent>

        <TabsContent value="warning" className="space-y-2 mt-6">
          {warningAlerts.length > 0 ? (
            warningAlerts.map(alert => (
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
            <p className="text-center text-muted-foreground py-12">No warning alerts</p>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-2 mt-6">
          {infoAlerts.length > 0 ? (
            infoAlerts.map(alert => (
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
            <p className="text-center text-muted-foreground py-12">No info alerts</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
