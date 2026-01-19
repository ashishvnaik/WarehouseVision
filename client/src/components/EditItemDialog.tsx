import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import type { InventoryItem } from "@shared/schema";

interface EditItemDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<InventoryItem>) => void;
}

export function EditItemDialog({ item, open, onOpenChange, onSave }: EditItemDialogProps) {
  const [userInput, setUserInput] = useState("");
  const [minThreshold, setMinThreshold] = useState("");

  useEffect(() => {
    if (item) {
      setUserInput(item.userInput || "");
      setMinThreshold(item.minThreshold.toString());
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;
    
    onSave(item.id, {
      userInput: userInput.trim() || null,
      minThreshold: parseInt(minThreshold) || 10,
    });
    
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" data-testid="dialog-edit-item">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update item settings and recognition instructions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item Name</Label>
            <Input value={item.name} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">SKU</Label>
            <Input value={item.sku} disabled className="bg-muted font-mono" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minThreshold" className="text-sm font-medium">
              Minimum Threshold
            </Label>
            <Input
              id="minThreshold"
              type="number"
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              data-testid="input-min-threshold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userInput" className="text-sm font-medium">
              User Input (Recognition Instructions)
            </Label>
            <Textarea
              id="userInput"
              placeholder="Add custom instructions for recognizing and counting this item in future image analyses. For example: 'Look for blue boxes with XYZ logo', 'Count individual bottles, not cases', etc."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="textarea-user-input"
            />
            <p className="text-xs text-muted-foreground">
              These instructions will help the AI better recognize and count this item in subsequent warehouse images.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
