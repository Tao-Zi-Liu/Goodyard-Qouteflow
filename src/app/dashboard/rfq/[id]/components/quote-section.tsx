"use client";

import { useState, useEffect, useRef } from 'react';
import { Edit, Send, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QuoteDialog } from '@/components/quote-dialog';
import { AbandonQuoteDialog } from '@/components/abandon-quote-dialog';
import { useI18n } from '@/hooks/use-i18n';
import { aiTranslateText, AI_LANGUAGE_CODES } from '@/lib/ai-translate';
import type { Product, Quote, User } from './types';
import { formatRMB } from '@/lib/currency';

interface QuoteSectionProps {
    product: Product;
    productQuotes: Quote[];
    acceptedQuote: Quote | undefined;
    canSalesAccept: boolean;
    isUserAssigned: boolean;
    userQuote: Quote | undefined;
    userRole: string | undefined;
    users: User[];
    t: (key: string, params?: any) => string;
    onAcceptQuote: (productId: string, purchaserId: string) => void;
    onQuoteSubmit: (productId: string, price: number, deliveryDate: Date, message: string, existingQuote?: Quote) => void;
    onAbandonQuote: (productId: string, reason: string) => void;
}

const isChineseText = (text: string) => /[\u4e00-\u9fff]/.test(text);

function needsTranslation(text: string, targetLang: string): boolean {
    if (!text?.trim()) return false;
    if (targetLang === 'zh' && !isChineseText(text)) return true;
    if ((targetLang === 'en' || targetLang === 'de') && isChineseText(text)) return true;
    return false;
}

export function QuoteSection({
    product, productQuotes, acceptedQuote, canSalesAccept, isUserAssigned,
    userQuote, userRole, users, t,
    onAcceptQuote, onQuoteSubmit, onAbandonQuote
}: QuoteSectionProps) {
    const { language } = useI18n();
    const getPurchaser = (purchaserId: string) => users.find(u => u.id === purchaserId);

    // translations: { [quoteId_field]: translatedText }
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [translating, setTranslating] = useState<Record<string, boolean>>({});
    const translatedKeys = useRef<Set<string>>(new Set());

    // Auto-translate notes and abandonment reasons
    useEffect(() => {
        const targetLang = AI_LANGUAGE_CODES[language] || 'en';

        productQuotes.forEach(quote => {
            const qid = quote.id || quote.purchaserId;

            // Translate notes
            if (quote.notes && needsTranslation(quote.notes, language)) {
                const key = `${qid}_notes_${language}`;
                if (!translatedKeys.current.has(key)) {
                    translatedKeys.current.add(key);
                    setTranslating(prev => ({ ...prev, [`${qid}_notes`]: true }));
                    aiTranslateText(quote.notes!, targetLang)
                        .then(r => setTranslations(prev => ({ ...prev, [`${qid}_notes`]: r.translatedText })))
                        .catch(() => translatedKeys.current.delete(key))
                        .finally(() => setTranslating(prev => ({ ...prev, [`${qid}_notes`]: false })));
                }
            }

            // Translate abandonment reason
            if (quote.abandonmentReason && needsTranslation(quote.abandonmentReason, language)) {
                const key = `${qid}_abandon_${language}`;
                if (!translatedKeys.current.has(key)) {
                    translatedKeys.current.add(key);
                    setTranslating(prev => ({ ...prev, [`${qid}_abandon`]: true }));
                    aiTranslateText(quote.abandonmentReason!, targetLang)
                        .then(r => setTranslations(prev => ({ ...prev, [`${qid}_abandon`]: r.translatedText })))
                        .catch(() => translatedKeys.current.delete(key))
                        .finally(() => setTranslating(prev => ({ ...prev, [`${qid}_abandon`]: false })));
                }
            }
        });
    }, [productQuotes, language]);

    // Clear translations on language change for re-translation
    useEffect(() => {
        setTranslations({});
        translatedKeys.current.clear();
    }, [language]);

    const get = (key: string, original: string) => translations[key] || original;

    return (
        <div className="mt-4">
            <h4 className="font-semibold mb-2">{t('quotes')}</h4>
            {productQuotes.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('no_quotes_yet')}</p>
            )}
            <div className="space-y-4">
                {productQuotes.map(quote => {
                    const qid = quote.id || quote.purchaserId;
                    return (
                        <div
                            key={qid}
                            className={`p-3 rounded-lg space-y-3 ${
                                quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50' :
                                quote.status === 'Abandoned' ? 'bg-orange-100 dark:bg-orange-900/50' :
                                'bg-muted/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={getPurchaser(quote.purchaserId)?.avatar} />
                                        <AvatarFallback>{getPurchaser(quote.purchaserId)?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{getPurchaser(quote.purchaserId)?.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('quoted_on')}: {new Date(quote.quoteTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    {quote.status === 'Abandoned' ? (
                                        <p className="text-lg font-bold text-orange-600">Quote Abandoned</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {userRole === 'Purchasing' ? (
                                                <>
                                                    <p className="text-sm text-muted-foreground">Sales Cost Price:</p>
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {formatRMB(quote.salesCostPriceRMB || quote.price || 0)}
                                                    </p>
                                                    <p className="text-sm text-blue-500">
                                                        ${(quote.salesCostPriceUSD || quote.priceUSD || 0).toFixed(2)} USD
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">{t('header_sale_price')}:</p>
                                                    <p className="text-sm font-semibold text-green-600">
                                                        ${(quote.customizedProductPriceUSD || 0).toFixed(2)} USD
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-muted-foreground">{t('header_sale_price')}:</p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        ${(quote.customizedProductPriceUSD || 0).toFixed(2)} USD
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Operational Notes — auto-translated */}
                            {quote.notes && (
                                <div className="bg-background/50 p-2 rounded border-l-4 border-blue-500">
                                    <div className="flex items-center gap-1 mb-1">
                                        <p className="text-sm font-medium text-blue-700">{t('operational_notes')}:</p>
                                        {translating[`${qid}_notes`] && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {get(`${qid}_notes`, quote.notes)}
                                    </p>
                                    {translations[`${qid}_notes`] && (
                                        <p className="text-xs text-muted-foreground/60 italic mt-1">
                                            {t('original')}: {quote.notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Abandonment Reason — auto-translated */}
                            {quote.status === 'Abandoned' && quote.abandonmentReason && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded border-l-4 border-orange-500">
                                    <div className="flex items-center gap-1 mb-1">
                                        <p className="text-sm font-medium text-orange-700">{t('abandonment_reason_label')}:</p>
                                        {translating[`${qid}_abandon`] && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {get(`${qid}_abandon`, quote.abandonmentReason)}
                                    </p>
                                    {translations[`${qid}_abandon`] && (
                                        <p className="text-xs text-muted-foreground/60 italic mt-1">
                                            {t('original')}: {quote.abandonmentReason}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('abandoned_on')}: {new Date(quote.abandonedAt || quote.quoteTime).toLocaleDateString()}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2">
                                {canSalesAccept && quote.status !== 'Abandoned' && (
                                    <Button size="sm" variant="outline" onClick={() => onAcceptQuote(product.id, quote.purchaserId)}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> {t('accept')}
                                    </Button>
                                )}
                                {quote.status === 'Accepted' && <Badge variant="default" className="bg-green-500">{t('accepted')}</Badge>}
                                {quote.status === 'Rejected' && <Badge variant="destructive">{t('rejected')}</Badge>}
                                {quote.status === 'Abandoned' && <Badge variant="secondary" className="bg-orange-500 text-white">{t('status_abandoned')}</Badge>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {userRole === 'Purchasing' && isUserAssigned && !acceptedQuote && !userQuote?.status?.includes('Abandoned') && (
                <div className="mt-4 space-y-2">
                    <QuoteDialog product={product} userQuote={userQuote} onQuoteSubmit={onQuoteSubmit}>
                        <Button className="w-full" variant={userQuote ? 'outline' : 'default'}>
                            {userQuote
                                ? <><Edit className="mr-2 h-4 w-4" /> {t('edit_your_quote')}</>
                                : <><Send className="mr-2 h-4 w-4" /> {t('submit_your_quote')}</>
                            }
                        </Button>
                    </QuoteDialog>
                    <AbandonQuoteDialog
                        productId={product.id}
                        productName={product.sku || 'N/A'}
                        onAbandonQuote={onAbandonQuote}
                    >
                        <Button className="w-full" variant="destructive">
                            <XCircle className="mr-2 h-4 w-4" />
                            {t('abandon_quote')}
                        </Button>
                    </AbandonQuoteDialog>
                </div>
            )}
        </div>
    );
}
