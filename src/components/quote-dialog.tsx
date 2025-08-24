"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Product, Quote } from '@/lib/types';
import { convertRMBToUSD, formatRMB, formatUSD } from '@/lib/currency';

interface QuoteDialogProps {
  children: React.ReactNode;
  product: Product;
  userQuote?: Quote;
  onQuoteSubmit: (productId: string, price: number, deliveryDate: Date, message: string, existingQuote?: Quote) => Promise<void>;
}

export function QuoteDialog({ children, product, userQuote, onQuoteSubmit }: QuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(userQuote?.price?.toString() || '');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(
    userQuote?.deliveryDate ? new Date(userQuote.deliveryDate) : undefined
  );
  const [message, setMessage] = useState(userQuote?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || !deliveryDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onQuoteSubmit(product.id, Number(price), deliveryDate, message, userQuote);

      setOpen(false);
    } catch (error) {
      console.error('Error submitting quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPrice(userQuote?.price?.toString() || '');
    setDeliveryDate(userQuote?.deliveryDate ? new Date(userQuote.deliveryDate) : undefined);
    setMessage(userQuote?.notes || '');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {userQuote ? 'Update Your Quote' : 'Submit Your Quote'}
          </DialogTitle>
          <DialogDescription>
          Enter your price in RMB and delivery date for <strong>{product.sku}</strong> ({product.wlid}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price (RMB)
              </Label>
              <div className="col-span-3">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mb-2"
                  placeholder="0.00"
                  placeholder="Enter price in RMB"
                  required
                />
                {price && !isNaN(Number(price)) && Number(price) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ≈ {formatUSD(convertRMBToUSD(Number(price)))} USD
                  </div>
                )}
              </div>
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
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right pt-2">
              Message
            </Label>
            <div className="col-span-3 space-y-2">
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add operational notes about this quote (optional)"
                maxLength={300}
              />
              <div className="text-xs text-muted-foreground text-right">
                {message.length}/300 characters
              </div>
            </div>
          </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !price || !deliveryDate}>
              {isSubmitting ? 'Submitting...' : (userQuote ? 'Update Quote' : 'Submit Quote (RMB)')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}