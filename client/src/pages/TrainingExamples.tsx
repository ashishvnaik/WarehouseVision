import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Upload, X, Image } from "lucide-react";

interface DetectedItem {
  itemType: string;
  count: number;
  countingMethod: string;
  confidence?: number;
}

interface TrainingExample {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  detectedItems: string;
  isActive: number;
  createdAt: string;
}

const detectedItemSchema = z.object({
  itemType: z.string().min(1, "Item type is required"),
  count: z.number().min(0, "Count must be 0 or greater"),
  countingMethod: z.string().min(1, "Counting method is required"),
  confidence: z.number().min(0).max(100).optional(),
});

const trainingExampleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  detectedItems: z.array(detectedItemSchema).min(1, "At least one item is required"),
});

type TrainingExampleFormValues = z.infer<typeof trainingExampleFormSchema>;

export default function TrainingExamples() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<TrainingExample | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([{ itemType: "", count: 0, countingMethod: "" }]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: examples = [], isLoading } = useQuery<TrainingExample[]>({
    queryKey: ['/api/training-examples'],
  });

  const form = useForm<TrainingExampleFormValues>({
    resolver: zodResolver(trainingExampleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      detectedItems: [{ itemType: "", count: 0, countingMethod: "" }],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/training-examples', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to create training example');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-examples'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Example Created",
        description: "Training example has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create training example. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TrainingExample> }) => {
      const response = await fetch(`/api/training-examples/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update training example');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-examples'] });
      setDialogOpen(false);
      setEditingExample(null);
      resetForm();
      toast({
        title: "Example Updated",
        description: "Training example has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update training example. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/training-examples/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete training example');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-examples'] });
      toast({
        title: "Example Deleted",
        description: "Training example has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete training example. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const response = await fetch(`/api/training-examples/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        throw new Error('Failed to toggle example status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-examples'] });
    },
  });

  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      detectedItems: [{ itemType: "", count: 0, countingMethod: "" }],
    });
    setPreviewImage(null);
    setDetectedItems([{ itemType: "", count: 0, countingMethod: "" }]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenDialog = (example?: TrainingExample) => {
    if (example) {
      setEditingExample(example);
      const items = JSON.parse(example.detectedItems) as DetectedItem[];
      form.reset({
        title: example.title,
        description: example.description || "",
        detectedItems: items,
      });
      setDetectedItems(items);
      setPreviewImage(example.imageUrl);
    } else {
      setEditingExample(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addDetectedItem = () => {
    setDetectedItems([...detectedItems, { itemType: "", count: 0, countingMethod: "" }]);
  };

  const removeDetectedItem = (index: number) => {
    if (detectedItems.length > 1) {
      setDetectedItems(detectedItems.filter((_, i) => i !== index));
    }
  };

  const updateDetectedItem = (index: number, field: keyof DetectedItem, value: string | number) => {
    const updated = [...detectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setDetectedItems(updated);
    form.setValue('detectedItems', updated);
  };

  const handleSubmit = (data: TrainingExampleFormValues) => {
    if (editingExample) {
      updateMutation.mutate({
        id: editingExample.id,
        data: {
          title: data.title,
          description: data.description || null,
          detectedItems: JSON.stringify(detectedItems),
        },
      });
    } else {
      if (!previewImage && !fileInputRef.current?.files?.[0]) {
        toast({
          title: "Error",
          description: "Please upload an image for this training example.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('detectedItems', JSON.stringify(detectedItems));
      
      if (fileInputRef.current?.files?.[0]) {
        formData.append('image', fileInputRef.current.files[0]);
      }

      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this training example?")) {
      deleteMutation.mutate(id);
    }
  };

  const parseDetectedItems = (jsonString: string): DetectedItem[] => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Training Examples</h1>
          <p className="text-muted-foreground">
            Add example warehouse images with accurate counts to improve AI detection accuracy
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-example">
              <Plus className="mr-2 h-4 w-4" />
              Add Example
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingExample ? "Edit Training Example" : "Add Training Example"}</DialogTitle>
              <DialogDescription>
                {editingExample 
                  ? "Update the training example details." 
                  : "Upload a warehouse image and provide the accurate item counts and counting methodology."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Warehouse Section A - Beverages" {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the scene and any helpful context..."
                          rows={2}
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Image</FormLabel>
                  {!editingExample && (
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        data-testid="input-image"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-image"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                      {previewImage && (
                        <span className="text-sm text-muted-foreground">Image selected</span>
                      )}
                    </div>
                  )}
                  {previewImage && (
                    <div className="mt-2 relative inline-block">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-w-xs max-h-48 rounded-lg border"
                        data-testid="img-preview"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Detected Items</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addDetectedItem} data-testid="button-add-item">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Item
                    </Button>
                  </div>
                  <FormDescription>
                    List each item type with its accurate count and how you counted it.
                  </FormDescription>
                  
                  {detectedItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted rounded-lg">
                      <div className="col-span-4">
                        <Input
                          placeholder="Item type (e.g., Coca-Cola 12oz cans)"
                          value={item.itemType}
                          onChange={(e) => updateDetectedItem(index, 'itemType', e.target.value)}
                          data-testid={`input-item-type-${index}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Count"
                          value={item.count}
                          onChange={(e) => updateDetectedItem(index, 'count', parseInt(e.target.value) || 0)}
                          data-testid={`input-item-count-${index}`}
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          placeholder="Counting method (e.g., 4 rows x 6 cans = 24)"
                          value={item.countingMethod}
                          onChange={(e) => updateDetectedItem(index, 'countingMethod', e.target.value)}
                          data-testid={`input-counting-method-${index}`}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDetectedItem(index)}
                          disabled={detectedItems.length === 1}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-example">
                    {editingExample ? "Update" : "Create"} Example
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {examples.map((example) => {
          const items = parseDetectedItems(example.detectedItems);
          return (
            <Card key={example.id} className={example.isActive === 0 ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    {example.imageUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={example.imageUrl} 
                          alt={example.title}
                          className="w-24 h-24 object-cover rounded-lg border"
                          data-testid={`img-example-${example.id}`}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{example.title}</CardTitle>
                        {example.isActive === 1 ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {example.description && (
                        <CardDescription className="mt-1">{example.description}</CardDescription>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {new Date(example.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={example.isActive === 1}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: example.id, isActive: checked ? 1 : 0 })
                      }
                      data-testid={`switch-active-${example.id}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(example)}
                      data-testid={`button-edit-${example.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(example.id)}
                      data-testid={`button-delete-${example.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Items in this example:</h4>
                  <div className="grid gap-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-2 bg-muted rounded text-sm">
                        <span className="font-medium flex-1">{item.itemType}</span>
                        <Badge variant="secondary">{item.count} items</Badge>
                        <span className="text-muted-foreground italic">{item.countingMethod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {examples.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Image className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">No training examples yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add warehouse images with accurate counts to help the AI learn better detection patterns.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
