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
import { convertRMBToUSD, calculateCustomizedPrice, formatRMB, formatUSD } from '@/lib/currency';
import { useI18n } from '@/hooks/use-i18n';

interface QuoteDialogProps {
  children: React.ReactNode;
  product: Product;
  userQuote?: Quote;
  onQuoteSubmit: (productId: string, price: number, deliveryDateFrom: Date | undefined, deliveryDateTo: Date | undefined, message: string, existingQuote?: Quote) => Promise<void>;
}

export function QuoteDialog({ children, product, userQuote, onQuoteSubmit }: QuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(
    userQuote?.salesCostPriceRMB?.toString() || userQuote?.price?.toString() || ''
  );
  const [deliveryDateFrom, setDeliveryDateFrom] = useState<Date | undefined>(
    userQuote?.deliveryDateFrom ? new Date(userQuote.deliveryDateFrom) : undefined
  );
  const [deliveryDateTo, setDeliveryDateTo] = useState<Date | undefined>(
    userQuote?.deliveryDateTo ? new Date(userQuote.deliveryDateTo) : undefined
  );
  const [message, setMessage] = useState(userQuote?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();

  const isValid = price && (deliveryDateFrom || deliveryDateTo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      await onQuoteSubmit(product.id, Number(price), deliveryDateFrom, deliveryDateTo, message, userQuote);
      setOpen(false);
    } catch (error) {
      console.error('Error submitting quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPrice(userQuote?.salesCostPriceRMB?.toString() || userQuote?.price?.toString() || '');
    setDeliveryDateFrom(userQuote?.deliveryDateFrom ? new Date(userQuote.deliveryDateFrom) : undefined);
    setDeliveryDateTo(userQuote?.deliveryDateTo ? new Date(userQuote.deliveryDateTo) : undefined);
    setMessage(userQuote?.notes || '');
  };

  const rmbPrice = price && !isNaN(Number(price)) ? Number(price) : 0;
  const salesCostUSD = rmbPrice > 0 ? convertRMBToUSD(rmbPrice) : 0;
  const customizedPriceUSD = rmbPrice > 0 ? calculateCustomizedPrice(rmbPrice) : 0;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {userQuote ? t('update_your_quote') : t('submit_your_quote')}
          </DialogTitle>
          <DialogDescription>
            {t('enter_price_and_delivery_description')} <strong>{product.sku}</strong> ({product.wlid}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">

            {/* Price */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                {t('price_rmb')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mb-2"
                  placeholder={t('enter_price_rmb')}
                  required
                />
                {rmbPrice > 0 && (
                  <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                    <div className="font-medium text-muted-foreground">Price Preview:</div>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex justify-between">
                        <span>Sales Cost (RMB):</span>
                        <span className="font-medium">{formatRMB(rmbPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sales Cost (USD):</span>
                        <span className="font-medium">{formatUSD(salesCostUSD)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Sale Price (USD):</span>
                        <span className="font-medium text-green-600">{formatUSD(customizedPriceUSD)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Earliest Delivery Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm leading-tight">
                {t('delivery_date_from')}
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDateFrom ? format(deliveryDateFrom, "PPP") : <span>{t('pick_date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deliveryDateFrom}
                      onSelect={setDeliveryDateFrom}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Latest Delivery Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm leading-tight">
                {t('delivery_date_to')}
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDateTo ? format(deliveryDateTo, "PPP") : <span>{t('pick_date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deliveryDateTo}
                      onSelect={setDeliveryDateTo}
                      disabled={(date) => date < new Date() || (deliveryDateFrom ? date < deliveryDateFrom : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {!deliveryDateFrom && !deliveryDateTo && (
                  <p className="text-xs text-destructive mt-1">{t('delivery_date_required')}</p>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="message" className="text-right pt-2">
                {t('message')}
              </Label>
              <div className="col-span-3 space-y-2">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('add_operational_notes')}
                  maxLength={300}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {message.length}/300 {t('characters')}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? t('submitting') : (userQuote ? t('update_quote') : t('submit_quote_rmb'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}