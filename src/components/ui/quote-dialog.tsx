// src/components/ui/quote-dialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (price: number, deliveryDate: Date) => void;
  title?: string;
  description?: string;
  initialPrice?: number;
  initialDeliveryDate?: Date;
}

export function QuoteDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "Submit Quote",
  description = "Enter the price and estimated delivery date for your quote.",
  initialPrice,
  initialDeliveryDate
}: QuoteDialogProps) {
  const [price, setPrice] = React.useState(initialPrice?.toString() || "");
  const [deliveryDate, setDeliveryDate] = React.useState<Date | undefined>(initialDeliveryDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price && deliveryDate) {
      onSubmit(Number(price), deliveryDate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="col-span-3"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Delivery Date</Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Quote</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
 