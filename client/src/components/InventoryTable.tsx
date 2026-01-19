import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Edit, ArrowUpDown, Trash2 } from "lucide-react";
import { useState } from "react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  location: string;
  currentCount: number;
  minThreshold: number;
  category: string;
  lastUpdated: string;
  imageUrl: string | null;
  userInput: string | null;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function InventoryTable({ items, onEdit, onDelete }: InventoryTableProps) {
  const [sortField, setSortField] = useState<keyof InventoryItem>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof InventoryItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    // Handle null values
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    
    return aVal > bVal ? direction : -direction;
  });

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
    <div className="border rounded-lg" data-testid="inventory-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                className="h-8 px-2 hover-elevate"
                onClick={() => handleSort('name')}
                data-testid="button-sort-name"
              >
                Item Name
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="max-w-xs">User Input</TableHead>
            <TableHead>
              <Button 
                variant="ghost" 
                className="h-8 px-2 hover-elevate"
                onClick={() => handleSort('currentCount')}
                data-testid="button-sort-count"
              >
                Count
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => (
            <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
              <TableCell>
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-14 h-14 object-cover rounded border"
                    data-testid={`img-item-${item.id}`}
                  />
                ) : (
                  <div className="w-14 h-14 bg-muted rounded border flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium" data-testid={`text-item-name-${item.id}`}>
                {item.name}
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{item.sku}</span>
              </TableCell>
              <TableCell>{item.location}</TableCell>
              <TableCell className="max-w-xs">
                {item.userInput ? (
                  <span className="text-sm text-muted-foreground line-clamp-2" title={item.userInput}>
                    {item.userInput}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No instructions</span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-mono font-medium">{item.currentCount}</span>
                <span className="text-muted-foreground text-sm"> / {item.minThreshold}</span>
              </TableCell>
              <TableCell>{getStatusBadge(item.currentCount, item.minThreshold)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.lastUpdated}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(item.id)}
                    data-testid={`button-edit-${item.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete?.(item.id)}
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
  );
}
