import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, Images } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const SESSION_UPLOADS_KEY = "wv_session_uploads";

interface SessionUpload {
  id: string;
  fileName: string;
  photoDate: string;
  imageUrl: string | null;
  detectedItems: { itemType: string; count: number; confidence: number }[];
  analyzedAt: string;
}

function loadSessionUploads(): SessionUpload[] {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_UPLOADS_KEY) || "[]");
  } catch {
    return [];
  }
}

function removeFromSession(id: string) {
  try {
    const existing = loadSessionUploads().filter((u) => u.id !== id);
    sessionStorage.setItem(SESSION_UPLOADS_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export default function MyUploads() {
  const [uploads, setUploads] = useState<SessionUpload[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setUploads(loadSessionUploads());
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/analysis/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return id;
    },
    onSuccess: (id: string) => {
      removeFromSession(id);
      setUploads((prev) => prev.filter((u) => u.id !== id));
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-with-history"] });
      toast({ title: "Upload deleted", description: "The upload and its inventory count have been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete upload.", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">My Uploads</h1>
        <p className="text-muted-foreground">Images you uploaded this session</p>
      </div>

      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Images className="h-12 w-12" />
          <p className="text-sm">No uploads yet this session. Go to Upload to analyze warehouse images.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {uploads.map((upload) => (
            <Card key={upload.id} data-testid={`card-upload-${upload.id}`}>
              <CardContent className="p-0">
                {upload.imageUrl ? (
                  <img
                    src={upload.imageUrl}
                    alt={upload.fileName}
                    className="w-full h-48 object-cover rounded-t-lg"
                    data-testid={`img-upload-${upload.id}`}
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" title={upload.fileName}>
                        {upload.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Photo date: {format(parseISO(upload.photoDate + "T00:00:00"), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {format(parseISO(upload.analyzedAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(upload.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete this upload"
                      data-testid={`button-delete-upload-${upload.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {upload.detectedItems.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Detected Items
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {upload.detectedItems.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item.itemType} × {item.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No items detected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
