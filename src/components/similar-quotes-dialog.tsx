"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Quote, User } from "@/lib/types";

interface SimilarQuotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotes: Quote[];
  purchasingUsers: User[];
}

export function SimilarQuotesDialog({ open, onOpenChange, quotes, purchasingUsers }: SimilarQuotesDialogProps) {
  const getPurchaserName = (id: string) => {
    return purchasingUsers.find(u => u.id === id)?.name || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Similar Historical Quotes Found</DialogTitle>
          <DialogDescription>
            Here are the most recent quotes for products with similar specifications.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Quoted By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">${quote.price.toFixed(2)}</TableCell>
                  <TableCell>{new Date(quote.deliveryDate).toLocaleDateString()}</TableCell>
                  <TableCell>{getPurchaserName(quote.purchaserId)}</TableCell>
                  <TableCell>
                    <Badge variant={quote.status === 'Accepted' ? 'default' : 'secondary'} className={quote.status === 'Accepted' ? 'bg-green-500' : ''}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
