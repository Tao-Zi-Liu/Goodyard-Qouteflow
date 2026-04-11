"use client";

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';

interface AiExtractDialogProps {
  onApply: (data: any) => void;
}

export function AiExtractDialog({ onApply }: AiExtractDialogProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleExtract = async () => {
    if (!text.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter some text to extract.' });
      return;
    }
    setIsLoading(true);
    try {
      // TODO: Re-enable when cloud function is ready
      // const functions = getFunctions(getApp());
      // const fn = httpsCallable(functions, 'extractrfq');
      // const result = await fn({ inputText: text });
      const Result = {
        data: {
          customerEmail: 'extracted@example.com',
          products: [{ productSeries: 'Wig', description: text }],
        },
      };
      onApply(Result.data);
      setIsOpen(false);
      toast({ title: 'Extraction Successful', description: 'The form has been pre-filled with the extracted data.' });
    } catch (error) {
      console.error('AI extraction failed:', error);
      toast({ variant: 'destructive', title: 'Extraction Failed', description: 'Could not extract details from the provided text.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-purple-400 to-pink-500 text-white border-none hover:from-purple-500 hover:to-pink-600 hover:text-white"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {t('button_ai_extract')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI RFQ Extraction</DialogTitle>
          <DialogDescription>
            Paste the RFQ details from an email or message, and the AI will attempt to fill out the
            form for you.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="e.g., 'New customer rfq@example.com wants a quote for two products...'"
          rows={8}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleExtract} disabled={isLoading}>
            {isLoading ? 'Extracting...' : 'Extract and Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
