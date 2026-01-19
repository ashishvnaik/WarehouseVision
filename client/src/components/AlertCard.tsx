import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

interface AlertCardProps {
  id: string;
  itemName: string;
  currentCount: number;
  threshold: number;
  severity: "critical" | "warning" | "info";
  onDismiss?: (id: string) => void;
}

export function AlertCard({ id, itemName, currentCount, threshold, severity, onDismiss }: AlertCardProps) {
  const severityConfig = {
    critical: {
      icon: AlertCircle,
      borderColor: "border-l-destructive",
      iconColor: "text-destructive",
      bgColor: "bg-destructive/5",
    },
    warning: {
      icon: AlertTriangle,
      borderColor: "border-l-chart-4",
      iconColor: "text-chart-4",
      bgColor: "bg-chart-4/5",
    },
    info: {
      icon: Info,
      borderColor: "border-l-chart-1",
      iconColor: "text-chart-1",
      bgColor: "bg-chart-1/5",
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={`p-4 border-l-4 ${config.borderColor} ${config.bgColor}`} data-testid={`alert-${severity}-${id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" data-testid={`text-alert-item-${id}`}>
              {itemName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current: <span className="font-mono font-medium">{currentCount}</span> / 
              Threshold: <span className="font-mono font-medium">{threshold}</span>
            </p>
          </div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={() => onDismiss(id)}
            data-testid={`button-dismiss-alert-${id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
