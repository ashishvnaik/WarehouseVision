import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { AnalysisResult } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ImagePopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string | null;
  itemName: string;
  photoDate: string;
}

export function ImagePopupDialog({
  open,
  onOpenChange,
  analysisId,
  itemName,
  photoDate,
}: ImagePopupDialogProps) {
  const { data: analysisResult, isLoading, error } = useQuery<AnalysisResult>({
    queryKey: [`/api/analysis/${analysisId}`],
    enabled: open && !!analysisId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-image-popup">
            {itemName} - {photoDate}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Loading image...</span>
            </div>
          ) : error ? (
            <div className="text-muted-foreground" data-testid="text-image-error">
              Failed to load the source image.
            </div>
          ) : analysisResult?.imageUrl ? (
            <img
              src={analysisResult.imageUrl}
              alt={`Analysis for ${itemName}`}
              className="max-w-full max-h-[60vh] object-contain rounded-lg border"
              data-testid="img-analysis-source"
            />
          ) : (
            <div className="text-muted-foreground" data-testid="text-no-image">
              No source image available for this count.
            </div>
          )}
        </div>
        {analysisResult && (
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <span>Detected count: {analysisResult.detectedCount}</span>
            <span>Confidence: {analysisResult.confidence}%</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
