import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Package, Trash2, ArrowUp, ArrowDown, Edit, Image as ImageIcon, Info } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, InventoryItemCount } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { EditItemDialog } from "@/components/EditItemDialog";
import { ImagePopupDialog } from "@/components/ImagePopupDialog";

interface CountWithMethod extends InventoryItemCount {
  countingMethod?: string;
}

interface ItemWithHistory extends InventoryItem {
  countHistory: CountWithMethod[];
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [imagePopupOpen, setImagePopupOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<{
    analysisId: string | null;
    itemName: string;
    photoDate: string;
  } | null>(null);
  const { toast } = useToast();
  
  const { data: items = [], isLoading } = useQuery<ItemWithHistory[]>({
    queryKey: ['/api/inventory-with-history'],
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-with-history'] });
      toast({
        title: "Item deleted",
        description: "The inventory item has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCountMutation = useMutation({
    mutationFn: async ({ itemId, photoDate }: { itemId: string; photoDate: string }) => {
      return await apiRequest('DELETE', `/api/inventory/${itemId}/counts/${photoDate}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-with-history'] });
      toast({
        title: "Count deleted",
        description: "The count for that date has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete count. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      return await apiRequest('PATCH', `/api/inventory/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-with-history'] });
      toast({
        title: "Item updated",
        description: "The inventory item has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setEditingItem(item);
      setEditDialogOpen(true);
    }
  };

  const handleSave = (id: string, updates: Partial<InventoryItem>) => {
    updateItemMutation.mutate({ id, updates });
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get all unique dates across all items, sorted chronologically
  const allDates = Array.from(new Set(
    items.flatMap(item => item.countHistory.map(c => c.photoDate))
  )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Helper to get count entry for a specific item and date
  const getCountEntryForDate = (item: ItemWithHistory, photoDate: string): CountWithMethod | null => {
    const countEntry = item.countHistory.find(c => c.photoDate === photoDate);
    return countEntry || null;
  };

  // Helper to get count for a specific item and date
  const getCountForDate = (item: ItemWithHistory, photoDate: string): number | null => {
    const countEntry = getCountEntryForDate(item, photoDate);
    return countEntry ? countEntry.absoluteCount : null;
  };

  const handleCountClick = (item: ItemWithHistory, photoDate: string) => {
    const countEntry = getCountEntryForDate(item, photoDate);
    if (countEntry) {
      setSelectedCount({
        analysisId: countEntry.sourceAnalysisId || null,
        itemName: item.name,
        photoDate: format(parseISO(photoDate), 'MMM d, yyyy'),
      });
      setImagePopupOpen(true);
    }
  };

  // Helper to calculate delta from previous date
  const getDelta = (item: ItemWithHistory, photoDate: string, dateIndex: number): number | null => {
    if (dateIndex === 0) return null; // First date has no previous
    
    const currentCount = getCountForDate(item, photoDate);
    if (currentCount === null) return null;
    
    // Find previous date with data for this item
    for (let i = dateIndex - 1; i >= 0; i--) {
      const prevCount = getCountForDate(item, allDates[i]);
      if (prevCount !== null) {
        return currentCount - prevCount;
      }
    }
    return null;
  };

  const getStatusBadge = (currentCount: number, threshold: number) => {
    if (currentCount === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (currentCount < threshold) {
      return <Badge className="bg-chart-4 text-white hover:bg-chart-4/90">Low Stock</Badge>;
    }
    return <Badge className="bg-chart-5 text-white hover:bg-chart-5/90">In Stock</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Inventory</h1>
          <p className="text-muted-foreground">Track inventory counts across different dates</p>
        </div>
        <Button data-testid="button-add-item">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search items or SKU..." 
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "No items match your search." : "No inventory items yet. Upload and analyze warehouse images to get started."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto" data-testid="inventory-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 w-14">Image</TableHead>
                  <TableHead className="sticky left-14 bg-background z-10 min-w-[150px]">Item Name</TableHead>
                  {allDates.map((date) => (
                    <TableHead key={date} className="min-w-[120px] text-center">
                      {format(parseISO(date), 'MMM d, yyyy')}
                    </TableHead>
                  ))}
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded border"
                          data-testid={`img-item-${item.id}`}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="sticky left-14 bg-background z-10 font-medium" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </TableCell>
                    {allDates.map((date, dateIndex) => {
                      const count = getCountForDate(item, date);
                      const delta = getDelta(item, date, dateIndex);
                      const hasCount = count !== null;
                      const countEntry = getCountEntryForDate(item, date);
                      const countingMethod = countEntry?.countingMethod;
                      
                      return (
                        <TableCell 
                          key={date} 
                          className="text-center"
                          data-testid={`cell-count-${item.id}-${date}`}
                        >
                          {hasCount ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCountClick(item, date)}
                                  className="font-mono font-medium text-lg hover:text-primary hover:underline cursor-pointer flex items-center gap-1"
                                  title="Click to view source image"
                                  data-testid={`button-view-count-image-${item.id}-${date}`}
                                >
                                  {count}
                                  {countEntry?.sourceAnalysisId && (
                                    <ImageIcon className="h-3 w-3 opacity-50" />
                                  )}
                                </button>
                                {countingMethod && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="text-muted-foreground hover:text-foreground">
                                        <Info className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="text-sm font-normal">{countingMethod}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-50 hover:opacity-100"
                                  onClick={() => deleteCountMutation.mutate({ itemId: item.id, photoDate: date })}
                                  disabled={deleteCountMutation.isPending}
                                  data-testid={`button-delete-count-${item.id}-${date}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {delta !== null && delta !== 0 && (
                                <div className={`flex items-center gap-0.5 text-xs ${delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {delta > 0 ? (
                                    <ArrowUp className="h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3" />
                                  )}
                                  <span data-testid={`delta-${item.id}-${date}`}>
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                </div>
                              )}
                              {delta === 0 && (
                                <span className="text-xs text-muted-foreground">no change</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item.id)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      )}

      <EditItemDialog
        item={editingItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSave}
      />

      <ImagePopupDialog
        open={imagePopupOpen}
        onOpenChange={setImagePopupOpen}
        analysisId={selectedCount?.analysisId || null}
        itemName={selectedCount?.itemName || ''}
        photoDate={selectedCount?.photoDate || ''}
      />
    </div>
  );
}
