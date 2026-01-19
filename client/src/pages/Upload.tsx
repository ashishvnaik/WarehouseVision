import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface Prompt {
  id: string;
  version: string;
  name: string;
  content: string;
  description: string | null;
  isDefault: number;
  createdAt: string;
}

interface ModelConfig {
  id: string;
  name: string;
  type: 'llm' | 'cnn';
  provider: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
}

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [photoDate, setPhotoDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();

  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
  });

  const { data: models = [] } = useQuery<ModelConfig[]>({
    queryKey: ['/api/models'],
  });

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/settings'],
  });

  // Automatically select the default prompt when prompts load (only if user hasn't selected one)
  useEffect(() => {
    if (prompts.length > 0 && !selectedPromptId) {
      const defaultPrompt = prompts.find(p => p.isDefault === 1);
      if (defaultPrompt) {
        setSelectedPromptId(defaultPrompt.id);
      }
    }
  }, [prompts, selectedPromptId]);

  // Automatically select the default model from settings
  useEffect(() => {
    if (settings.defaultModel && !selectedModelId) {
      setSelectedModelId(settings.defaultModel);
    } else if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [models, settings, selectedModelId]);

  const analyzeFile = async (file: File, promptId?: string, modelId?: string, photoDate?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (promptId) {
      formData.append('promptId', promptId);
    }
    if (modelId) {
      formData.append('modelId', modelId);
    }
    if (photoDate) {
      formData.append('photoDate', photoDate);
    }

    const imageCachingEnabled = localStorage.getItem('imageCachingEnabled');
    const skipCache = imageCachingEnabled === 'false';
    if (skipCache) {
      formData.append('skipCache', 'true');
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
      throw new Error(errorData.error || 'Analysis failed');
    }

    return response.json();
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload at least one image first.",
        variant: "destructive",
      });
      return;
    }

    setProgress(0);
    setCurrentFileIndex(0);
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setAnalysisResults([]);

    const results: any[] = [];
    const totalFiles = selectedFiles.length;

    for (let i = 0; i < totalFiles; i++) {
      setCurrentFileIndex(i);
      setProgress(Math.round((i / totalFiles) * 100));

      try {
        const result = await analyzeFile(
          selectedFiles[i],
          selectedPromptId || undefined,
          selectedModelId || undefined,
          photoDate || undefined
        );
        results.push({ ...result, fileName: selectedFiles[i].name, success: true });
      } catch (error: any) {
        results.push({ 
          fileName: selectedFiles[i].name, 
          success: false, 
          error: error.message || 'Analysis failed' 
        });
      }
    }

    setProgress(100);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    setAnalysisResults(results);

    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    queryClient.invalidateQueries({ queryKey: ['/api/inventory-with-history'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    toast({
      title: "Analysis Complete",
      description: failCount > 0 
        ? `Analyzed ${successCount} of ${totalFiles} images. ${failCount} failed.`
        : `Successfully analyzed ${successCount} image${successCount > 1 ? 's' : ''}.`,
      variant: failCount > 0 ? "destructive" : "default",
    });
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setAnalysisComplete(false);
    setAnalysisResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Upload & Analyze</h1>
        <p className="text-muted-foreground">Upload warehouse images or video frames for AI analysis</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Prompt Selection</CardTitle>
            <CardDescription>Choose which AI prompt version to use for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="prompt-select">AI Prompt Version</Label>
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                <SelectTrigger id="prompt-select" data-testid="select-prompt">
                  <SelectValue placeholder="Select a prompt version" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.version} - {prompt.name}
                      {prompt.isDefault === 1 && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPromptId && prompts.find(p => p.id === selectedPromptId)?.description && (
                <p className="text-sm text-muted-foreground">
                  {prompts.find(p => p.id === selectedPromptId)?.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Selection</CardTitle>
            <CardDescription>Choose which ML model to use for detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="model-select">Detection Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger id="model-select" data-testid="select-model-upload">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id} data-testid={`option-model-upload-${model.id}`}>
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {model.type.toUpperCase()} • {model.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModelId && (
                <p className="text-sm text-muted-foreground">
                  {models.find(m => m.id === selectedModelId)?.type === 'llm' 
                    ? 'Using large language model with vision for detailed product identification'
                    : 'Using convolutional neural network for fast, real-time object detection'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photo Date</CardTitle>
            <CardDescription>When were these images taken? This date will be used for tracking inventory changes over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="photo-date">Date Images Were Taken</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="photo-date"
                  type="date"
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                  className="max-w-[200px]"
                  data-testid="input-photo-date"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Inventory counts from this analysis will be recorded for {photoDate ? format(new Date(photoDate + 'T00:00:00'), 'MMMM d, yyyy') : 'today'}.
              </p>
            </div>
          </CardContent>
        </Card>

        <UploadZone onFilesSelected={handleFilesSelected} />

        {!analysisComplete && (
          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleAnalyze}
            disabled={isAnalyzing || selectedFiles.length === 0}
            data-testid="button-analyze"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Analyzing {currentFileIndex + 1} of {selectedFiles.length}...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Analysis {selectedFiles.length > 1 ? `(${selectedFiles.length} images)` : ''}
              </>
            )}
          </Button>
        )}

        {isAnalyzing && (
          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Processing image {currentFileIndex + 1} of {selectedFiles.length}
                  {selectedFiles[currentFileIndex] && ` - ${selectedFiles[currentFileIndex].name}`}
                </span>
                <span className="font-mono text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </Card>
        )}

        {analysisComplete && analysisResults.length > 0 && (
          <div className="space-y-4">
            {(() => {
              const successResults = analysisResults.filter((r: any) => r.success);
              const failedResults = analysisResults.filter((r: any) => !r.success);
              const allSkippedItems = successResults.flatMap((r: any) => 
                (r.skippedItems || []).map((item: any) => ({ ...item, fileName: r.fileName }))
              );
              const cachedResults = successResults.filter((r: any) => r.cached);
              const totalItems = successResults.reduce((sum: number, r: any) => 
                sum + (r.analysisResult?.totalItems || 0), 0
              );
              const allDetectedItems = successResults.flatMap((r: any) => 
                (r.analysisResult?.detectedItems || []).map((item: any) => ({ ...item, fileName: r.fileName }))
              );

              return (
                <>
                  {cachedResults.length > 0 && (
                    <Alert data-testid="alert-cached-results">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {cachedResults.length} image{cachedResults.length > 1 ? 's were' : ' was'} previously analyzed. Showing cached results.
                      </AlertDescription>
                    </Alert>
                  )}

                  {failedResults.length > 0 && (
                    <Alert variant="destructive" data-testid="alert-failed-images">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">{failedResults.length} image{failedResults.length > 1 ? 's' : ''} failed to analyze:</p>
                          {failedResults.map((r: any, i: number) => (
                            <div key={i} className="text-sm pl-4">• {r.fileName}: {r.error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {allSkippedItems.length > 0 && (
                    <Alert variant="destructive" data-testid="alert-skipped-items">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">
                            {allSkippedItems.length} item{allSkippedItems.length > 1 ? 's' : ''} detected but not added (low confidence):
                          </p>
                          <div className="space-y-1">
                            {allSkippedItems.map((item: any, index: number) => (
                              <div key={index} className="text-sm pl-4">
                                • {item.itemType} ({item.confidence}% confidence)
                              </div>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Card className="p-6 border-chart-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-chart-5" />
                        <div>
                          <p className="font-medium">Analysis Complete</p>
                          <p className="text-sm text-muted-foreground">
                            Analyzed {successResults.length} image{successResults.length > 1 ? 's' : ''} - Found {totalItems} total items
                          </p>
                        </div>
                      </div>
                      
                      {allDetectedItems.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Detected Items:</p>
                          <div className="space-y-1">
                            {allDetectedItems.map((item: any, index: number) => (
                              <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                <span>{item.itemType}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">Count: {item.count}</span>
                                  <span className="text-muted-foreground">({item.confidence}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {successResults.some((r: any) => r.uploadedImageUrl) && (
                    <Card className="p-6">
                      <p className="text-sm font-medium mb-3">Analyzed Images:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {successResults.filter((r: any) => r.uploadedImageUrl).map((result: any, index: number) => (
                          <div key={index} className="space-y-2">
                            <p className="text-xs text-muted-foreground truncate" title={result.fileName}>{result.fileName}</p>
                            <div className="relative rounded-lg overflow-hidden border">
                              <img 
                                src={result.uploadedImageUrl} 
                                alt={`Analyzed image - ${result.fileName}`}
                                className="w-full h-auto"
                                data-testid={`img-analyzed-${index}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
