"use client";

import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { History, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import type { RFQ } from '@/lib/types';

interface CustomerHistoryDialogProps {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  rfqs: RFQ[];
  t: (key: string, params?: any) => string;
}

export function CustomerHistoryDialog({
  email, open, onOpenChange, isLoading, rfqs, t,
}: CustomerHistoryDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            历史单据 — {email}
          </DialogTitle>
          <DialogDescription>
            {t('customer_history_dialog_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rfqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t('customer_history_empty')}
            </div>
          ) : (
            <div className="space-y-2 pr-1">
              {rfqs.map(rfq => {
                const ts = (rfq as any).inquiryTime;
                const dateStr = ts?.seconds
                  ? new Date(ts.seconds * 1000).toLocaleString()
                  : ts ? new Date(ts).toLocaleString() : '—';
                const productCount = rfq.products?.length ?? 0;
                const skus =
                  rfq.products
                    ?.map((p: any) => p.sku)
                    .filter(Boolean)
                    .join(', ') || '—';

                return (
                  <div
                    key={rfq.id}
                    className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {(rfq as any).rfqCode || rfq.id}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {rfq.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dateStr} · {productCount} 件产品
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        SKU: {skus}
                      </div>
                    </div>
                    <a
                      href={`/dashboard/rfq/${rfq.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 flex-shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                       {t('button_view_details')} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('button_close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook encapsulating the history lookup logic.
 * Usage: const { open, isLoading, rfqs, openDialog } = useCustomerHistory();
 */
export function useCustomerHistory() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);

  const openDialog = async (email: string) => {
    if (!email) return;
    setIsLoading(true);
    setOpen(true);
    try {
      const q = query(collection(db, 'rfqs'), where('customerEmail', '==', email));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RFQ[];
      results.sort((a, b) => {
        const ta = (a as any).lastUpdatedTime?.seconds ?? 0;
        const tb = (b as any).lastUpdatedTime?.seconds ?? 0;
        return tb - ta;
      });
      setRfqs(results);
    } catch (err) {
      console.error('Error fetching customer history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { open, setOpen, isLoading, rfqs, openDialog };
}
