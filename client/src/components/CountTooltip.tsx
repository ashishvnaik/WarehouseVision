import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AnalysisDetails {
  modelName: string;
  modelType: string;
  confidence: number;
  countingMethod: string | null;
  imageDescription: string | null;
}

interface CountTooltipProps {
  analysisId: string;
}

/**
 * Shows an Info icon that, when hovered, lazily fetches the analysis details
 * for this count (model, confidence, counting method). Nothing is loaded until
 * the tooltip is actually opened, keeping the inventory list lightweight.
 */
export function CountTooltip({ analysisId }: CountTooltipProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<AnalysisDetails>({
    queryKey: ["/api/analysis", analysisId, "details"],
    queryFn: () =>
      fetch(`/api/analysis/${analysisId}/details`, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    enabled: open,
    staleTime: Infinity, // cache forever once loaded — details never change
    retry: false,
  });

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="How this count was derived"
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1 p-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data ? (
          <>
            {data.countingMethod && (
              <p className="text-sm">{data.countingMethod}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {data.modelName} · {data.confidence}% confidence
            </p>
            {data.imageDescription && (
              <p className="text-xs text-muted-foreground border-t pt-1 mt-1">
                {data.imageDescription}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No details available</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
