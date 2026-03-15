import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Play, BookOpen, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Prompt {
  id: string;
  version: string;
  name: string;
  isDefault: number;
}

interface ModelConfig {
  id: string;
  name: string;
  type: 'llm' | 'cnn';
  provider: string;
  description: string;
}

interface DetectedItem {
  itemType: string;
  count: number;
  confidence: number;
  location?: string;
}

interface EvalResult {
  analysisResult: {
    id: string;
    detectedItems: DetectedItem[];
    totalItems: number;
    confidence: number;
    modelName: string;
    annotations?: string;
    imageUrl: string;
  };
  uploadedImageUrl: string;
  isTest: boolean;
}

export default function Evaluation() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const { data: prompts = [] } = useQuery<Prompt[]>({ queryKey: ['/api/prompts'] });
  const { data: models = [] } = useQuery<ModelConfig[]>({ queryKey: ['/api/models'] });

  useEffect(() => {
    if (prompts.length > 0 && !selectedPromptId) {
      const def = prompts.find(p => p.isDefault === 1);
      if (def) setSelectedPromptId(def.id);
    }
  }, [prompts, selectedPromptId]);

  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setEvalResult(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (selectedPromptId) formData.append('promptId', selectedPromptId);
      if (selectedModelId) formData.append('modelId', selectedModelId);

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Evaluation failed');
      }
      return res.json() as Promise<EvalResult>;
    },
    onSuccess: (result) => {
      setEvalResult(result);
    },
    onError: (err: Error) => {
      toast({ title: "Evaluation failed", description: err.message, variant: "destructive" });
    },
  });

  const saveAsExample = async () => {
    if (!evalResult || !selectedFile) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/training-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: selectedFile.name.replace(/\.[^.]+$/, ''),
          description: `Evaluated with ${evalResult.analysisResult.modelName} — ${evalResult.analysisResult.totalItems} items detected`,
          imageUrl: evalResult.uploadedImageUrl || evalResult.analysisResult.imageUrl,
          detectedItems: JSON.stringify(evalResult.analysisResult.detectedItems),
          isActive: 1,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      queryClient.invalidateQueries({ queryKey: ['/api/training-examples'] });
      toast({ title: "Saved as training example", description: "This image and its detections are now a training example." });
    } catch {
      toast({ title: "Error", description: "Failed to save training example.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Evaluation</h1>
        <p className="text-muted-foreground">Test a prompt + model combination without affecting inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: Configuration */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>Choose a prompt, model, and image to evaluate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eval-prompt">Prompt Version</Label>
                <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                  <SelectTrigger id="eval-prompt" data-testid="select-eval-prompt">
                    <SelectValue placeholder="Select a prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.version} — {p.name}{p.isDefault === 1 ? ' (Default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eval-model">Model</Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger id="eval-model" data-testid="select-eval-model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.type.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eval-image">Image</Label>
                <Input
                  id="eval-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  data-testid="input-eval-image"
                />
              </div>

              {previewUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                    data-testid="img-eval-preview"
                  />
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Evaluation runs are marked as test-only and never saved to inventory.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                onClick={() => runMutation.mutate()}
                disabled={!selectedFile || runMutation.isPending}
                data-testid="button-run-evaluation"
              >
                {runMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Evaluation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right panel: Results */}
        <div className="space-y-4">
          {!evalResult ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-muted-foreground border rounded-lg">
              <FlaskConical className="h-12 w-12" />
              <p className="text-sm">Run an evaluation to see results here</p>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Results</CardTitle>
                    <Badge variant="outline" className="text-xs">Test Only</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Model</p>
                      <p className="font-medium">{evalResult.analysisResult.modelName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Total Items</p>
                      <p className="font-medium font-mono">{evalResult.analysisResult.totalItems}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Avg Confidence</p>
                      <p className="font-medium font-mono">{evalResult.analysisResult.confidence}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Unique Types</p>
                      <p className="font-medium font-mono">{evalResult.analysisResult.detectedItems.length}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Detected Items</p>
                    {evalResult.analysisResult.detectedItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items detected</p>
                    ) : (
                      <div className="space-y-1">
                        {evalResult.analysisResult.detectedItems.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded" data-testid={`eval-item-${i}`}>
                            <span>{item.itemType}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">×{item.count}</span>
                              <Badge variant="outline" className="text-xs font-mono">{item.confidence}%</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {(evalResult.uploadedImageUrl || evalResult.analysisResult.imageUrl) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analyzed Image</p>
                        <div className="rounded-lg overflow-hidden border">
                          <img
                            src={evalResult.uploadedImageUrl || evalResult.analysisResult.imageUrl}
                            alt="Analyzed"
                            className="w-full h-auto"
                            data-testid="img-eval-result"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={saveAsExample}
                    disabled={isSaving}
                    data-testid="button-save-training-example"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save as Training Example"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
