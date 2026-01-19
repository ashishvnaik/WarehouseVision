import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ModelConfig {
  id: string;
  name: string;
  type: 'llm' | 'cnn';
  provider: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
}

export default function Settings() {
  const [imageCachingEnabled, setImageCachingEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [roboflowApiKey, setRoboflowApiKey] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(80);
  const { toast } = useToast();

  // Fetch available models
  const { data: models = [] } = useQuery<ModelConfig[]>({
    queryKey: ['/api/models'],
  });

  // Fetch current settings
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/settings'],
  });

  // Save setting mutation
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return await apiRequest('POST', '/api/settings', { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('imageCachingEnabled');
    if (saved !== null) {
      setImageCachingEnabled(saved === 'true');
    }

    if (settings.defaultModel && !selectedModel) {
      setSelectedModel(settings.defaultModel);
    }
    if (settings.confidenceThreshold) {
      setConfidenceThreshold(parseInt(settings.confidenceThreshold, 10));
    }
  }, [settings, selectedModel]);

  // Save setting to localStorage when it changes
  const handleCachingToggle = (checked: boolean) => {
    setImageCachingEnabled(checked);
    localStorage.setItem('imageCachingEnabled', String(checked));
    
    toast({
      title: checked ? "Image Caching Enabled" : "Image Caching Disabled",
      description: checked 
        ? "Duplicate images will return cached results without re-analyzing." 
        : "Same image can be analyzed multiple times for testing.",
    });
  };

  const handleModelChange = async (value: string) => {
    setSelectedModel(value);
    await saveSettingMutation.mutateAsync({
      key: 'defaultModel',
      value,
    });
    
    const model = models.find(m => m.id === value);
    toast({
      title: "Default Model Updated",
      description: `Now using ${model?.name} for inventory analysis.`,
    });
  };

  const handleSaveApiKey = async () => {
    if (!roboflowApiKey || roboflowApiKey === '••••••••') {
      toast({
        title: "Error",
        description: "Please enter a valid API key.",
        variant: "destructive",
      });
      return;
    }

    await saveSettingMutation.mutateAsync({
      key: 'roboflow_api_key',
      value: roboflowApiKey,
    });

    toast({
      title: "API Key Saved",
      description: "Roboflow API key has been saved securely on the server.",
    });
    setRoboflowApiKey('••••••••');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Image Analysis</CardTitle>
            <CardDescription>Configure how images are analyzed and processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="image-caching" className="text-base">
                  Enable Image Caching
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, identical images will return cached results to prevent duplicate inventory entries. 
                  Disable this for testing to analyze the same image multiple times.
                </p>
              </div>
              <Switch
                id="image-caching"
                checked={imageCachingEnabled}
                onCheckedChange={handleCachingToggle}
                data-testid="switch-image-caching"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ML Model Configuration</CardTitle>
            <CardDescription>Choose the machine learning model for inventory detection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-select" className="text-base">
                  Default Detection Model
                </Label>
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  data-testid="select-model"
                >
                  <SelectTrigger id="model-select" data-testid="trigger-model">
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id} data-testid={`option-model-${model.id}`}>
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
                <p className="text-sm text-muted-foreground">
                  LLM models like GPT-4 Vision provide detailed product identification. 
                  CNN models like YOLO offer faster, real-time object detection.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roboflow-key" className="text-base">
                  Roboflow API Key
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Required for YOLO models. Get your API key from{' '}
                  <a 
                    href="https://roboflow.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Roboflow
                  </a>
                </p>
                <div className="flex gap-2">
                  <Input
                    id="roboflow-key"
                    type="password"
                    value={roboflowApiKey}
                    onChange={(e) => setRoboflowApiKey(e.target.value)}
                    placeholder="Enter Roboflow API key..."
                    data-testid="input-roboflow-key"
                  />
                  <Button 
                    onClick={handleSaveApiKey}
                    disabled={saveSettingMutation.isPending}
                    data-testid="button-save-api-key"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detection Thresholds</CardTitle>
            <CardDescription>Confidence levels and detection settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confidence-threshold" className="text-base">Confidence Threshold</Label>
              <p className="text-sm text-muted-foreground">
                Items detected with confidence below this level are skipped and not added to inventory.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  id="confidence-threshold"
                  type="number"
                  min={0}
                  max={100}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value, 10) || 0)}
                  className="w-24 font-mono"
                  data-testid="input-confidence-threshold"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button
                  onClick={async () => {
                    await saveSettingMutation.mutateAsync({
                      key: 'confidenceThreshold',
                      value: String(confidenceThreshold),
                    });
                    toast({
                      title: "Confidence Threshold Updated",
                      description: `Items below ${confidenceThreshold}% confidence will be skipped.`,
                    });
                  }}
                  disabled={saveSettingMutation.isPending}
                  data-testid="button-save-confidence"
                >
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
