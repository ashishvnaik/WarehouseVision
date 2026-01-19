import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Star, StarOff } from "lucide-react";

interface Prompt {
  id: string;
  version: string;
  name: string;
  content: string;
  description: string | null;
  isDefault: number;
  createdAt: string;
}

const promptFormSchema = z.object({
  version: z.string().min(1, "Version is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content: z.string().min(10, "Prompt must be at least 10 characters"),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

export default function Prompts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const { toast } = useToast();

  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
  });

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      version: "",
      name: "",
      description: "",
      content: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromptFormValues) => {
      return apiRequest('POST', '/api/prompts', { ...data, isDefault: 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Prompt Created",
        description: "New prompt version has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromptFormValues> }) => {
      return apiRequest('PATCH', `/api/prompts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setDialogOpen(false);
      setEditingPrompt(null);
      form.reset();
      toast({
        title: "Prompt Updated",
        description: "Prompt has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      toast({
        title: "Prompt Deleted",
        description: "Prompt has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/prompts/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      toast({
        title: "Default Set",
        description: "This prompt is now the default for new analyses.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set default prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (prompt?: Prompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      form.reset({
        version: prompt.version,
        name: prompt.name,
        description: prompt.description || "",
        content: prompt.content,
      });
    } else {
      setEditingPrompt(null);
      form.reset({
        version: "",
        name: "",
        description: "",
        content: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (data: PromptFormValues) => {
    if (editingPrompt) {
      updateMutation.mutate({ id: editingPrompt.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      deleteMutation.mutate(id);
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
          <h1 className="text-3xl font-semibold tracking-tight mb-1">AI Prompts</h1>
          <p className="text-muted-foreground">Manage and version your object detection prompts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-prompt">
              <Plus className="mr-2 h-4 w-4" />
              Create Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPrompt ? "Edit Prompt" : "Create New Prompt"}</DialogTitle>
              <DialogDescription>
                {editingPrompt 
                  ? "Update the prompt details below." 
                  : "Create a new AI prompt version to improve detection accuracy."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input placeholder="v1.1" {...field} data-testid="input-version" />
                        </FormControl>
                        <FormDescription>Semantic version (e.g., v1.0, v2.1)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Improved Detection Prompt" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What improvements does this version include?"
                          rows={2}
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="You are a warehouse inventory analyst..."
                          rows={15}
                          className="font-mono text-sm"
                          {...field}
                          data-testid="textarea-content"
                        />
                      </FormControl>
                      <FormDescription>
                        The full AI prompt. Include instructions for detection, counting, and JSON response format.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-prompt">
                    {editingPrompt ? "Update" : "Create"} Prompt
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <Card key={prompt.id} className={prompt.isDefault === 1 ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{prompt.name}</CardTitle>
                    <Badge variant="secondary">{prompt.version}</Badge>
                    {prompt.isDefault === 1 && (
                      <Badge variant="default">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  {prompt.description && (
                    <CardDescription className="mt-2">{prompt.description}</CardDescription>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(prompt.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {prompt.isDefault !== 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDefaultMutation.mutate(prompt.id)}
                      title="Set as default"
                      data-testid={`button-set-default-${prompt.id}`}
                    >
                      <StarOff className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenDialog(prompt)}
                    data-testid={`button-edit-${prompt.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(prompt.id)}
                    disabled={prompt.isDefault === 1}
                    title={prompt.isDefault === 1 ? "Cannot delete default prompt" : "Delete prompt"}
                    data-testid={`button-delete-${prompt.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs whitespace-pre-wrap font-mono line-clamp-6">
                  {prompt.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prompts.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No prompts found. Create your first prompt version to get started.</p>
        </Card>
      )}
    </div>
  );
}
