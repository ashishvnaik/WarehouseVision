import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Layers } from "lucide-react";

interface Detection {
  label: string;
  confidence: number;
}

interface ImageAnnotationViewerProps {
  imageUrl?: string;
  detections: Detection[];
  timestamp?: string;
}

export function ImageAnnotationViewer({ imageUrl, detections, timestamp }: ImageAnnotationViewerProps) {
  return (
    <Card className="overflow-hidden" data-testid="image-annotation-viewer">
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="Warehouse analysis" className="w-full h-full object-cover" />
        ) : (
          <Camera className="h-16 w-16 text-muted-foreground" />
        )}
        {timestamp && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            {timestamp}
          </Badge>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span>Detected Items</span>
        </div>
        <div className="space-y-2">
          {detections.map((detection, index) => (
            <div key={index} className="flex items-center justify-between" data-testid={`detection-${index}`}>
              <span className="text-sm">{detection.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${detection.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                  {detection.confidence}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
