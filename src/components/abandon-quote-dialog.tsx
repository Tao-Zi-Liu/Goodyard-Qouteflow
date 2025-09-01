"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface AbandonQuoteDialogProps {
    children: React.ReactNode;
    productId: string;
    productName: string;
    onAbandonQuote: (productId: string, reason: string) => Promise<void>;
}

export function AbandonQuoteDialog({ 
    children, 
    productId, 
    productName, 
    onAbandonQuote 
}: AbandonQuoteDialogProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        // Validate reason
        if (!reason.trim()) {
            setError('Reason is required');
            return;
        }

        if (reason.length > 300) {
            setError('Reason must be 300 characters or less');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onAbandonQuote(productId, reason.trim());
            setOpen(false);
            setReason('');
        } catch (error) {
            console.error('Error abandoning quote:', error);
            setError('Failed to abandon quote. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
            setOpen(newOpen);
            if (!newOpen) {
                setReason('');
                setError('');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-orange-500" />
                        {t('abandon_quote_dialog_title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('abandon_quote_dialog_description')}
                        <br />
                        <span className="font-medium">Product: {productName}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="reason">{t('abandonment_reason')}</Label>
                        <Textarea
                            id="reason"
                            placeholder={t('abandonment_reason_placeholder')}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setError('');
                            }}
                            rows={4}
                            maxLength={300}
                            className="resize-none"
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">
                                {reason.length}/300 characters
                            </p>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        {t('cancel')}
                    </Button>
                    <Button 
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-2 h-4 w-4" />
                                {t('confirm_abandon')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}