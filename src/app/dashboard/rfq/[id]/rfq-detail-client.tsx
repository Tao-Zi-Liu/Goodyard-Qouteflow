"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { ArrowLeft, Edit, CheckCircle, Clock, Send, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_USERS } from '@/lib/data';
import type { RFQ, Quote, RFQStatus, Product } from '@/lib/types';
import { QuoteDialog } from '@/components/quote-dialog';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';

export default function RFQDetailClient() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const { user } = useAuth();
    const { toast } = useToast();
    const { createNotification } = useNotifications();
    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [creator, setCreator] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRfq = async () => {
            if (params.id) {
                const docRef = doc(db, "rfqs", params.id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const rfqData = { id: docSnap.id, ...docSnap.data() } as RFQ;
                    setRfq(rfqData);
                    const foundCreator = MOCK_USERS.find(u => u.id === rfqData.creatorId);
                    setCreator(foundCreator || null);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Not Found",
                        description: "The requested RFQ could not be found.",
                    });
                    router.push('/dashboard');
                }
            }
            setLoading(false);
        };

        fetchRfq();
    }, [params.id, router, toast]);

    const getPurchaser = (purchaserId: string) => MOCK_USERS.find(u => u.id === purchaserId);

    const getStatusVariant = (status: RFQStatus) => {
        // ... (same as before)
    };

    const handleAcceptQuote = async (productId: string, purchaserId: string) => {
        if (!rfq || !user || user.role !== 'Sales') return;

        try {
            const acceptedQuote = rfq.quotes.find(q => q.productId === productId && q.purchaserId === purchaserId);
            if (!acceptedQuote) throw new Error("Quote not found");

            const updatedQuotes = rfq.quotes.map(q => {
                if (q.productId === productId) {
                    return q.purchaserId === purchaserId
                        ? { ...q, status: 'Accepted' as const }
                        : { ...q, status: 'Rejected' as const };
                }
                return q;
            });

            // Check if all products have an accepted quote
            const allProductsQuoted = rfq.products.every(p =>
                updatedQuotes.some(q => q.productId === p.id && q.status === 'Accepted')
            );
            const newStatus = allProductsQuoted ? 'Quotation Completed' : rfq.status;

            const updatedRfqData = {
                quotes: updatedQuotes,
                status: newStatus
            };

            const docRef = doc(db, "rfqs", rfq.id);
            await updateDoc(docRef, updatedRfqData);

            const updatedRfq = { ...rfq, ...updatedRfqData };
            setRfq(updatedRfq);

            // Notify the accepted purchaser
            createNotification({
                recipientId: acceptedQuote.purchaserId,
                titleKey: 'notification_quote_accepted_title',
                bodyKey: 'notification_quote_accepted_body',
                bodyParams: { rfqCode: rfq.code, productName: rfq.products.find(p => p.id === productId)?.sku || '' },
                href: `/dashboard/rfq/${rfq.id}`,
            });

            toast({
                title: "Quote Accepted",
                description: "The quote has been accepted.",
            });
        } catch (error) {
            console.error("Error accepting quote: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to accept the quote.' });
        }
    };

    const handleQuoteSubmit = async (productId: string, price: number, deliveryDate: Date, existingQuote?: Quote) => {
        if (!rfq || !user) return;
        try {
            let updatedQuotes: Quote[];
            const isUpdate = !!existingQuote;

            if (isUpdate) {
                updatedQuotes = rfq.quotes.map(q =>
                    q.productId === productId && q.purchaserId === user.id
                        ? { ...q, price, deliveryDate: deliveryDate.toISOString(), quoteTime: new Date().toISOString() }
                        : q
                );
            } else {
                const newQuote: Quote = {
                    rfqId: rfq.id,
                    productId,
                    purchaserId: user.id,
                    price,
                    deliveryDate: deliveryDate.toISOString(),
                    quoteTime: new Date().toISOString(),
                    status: 'Pending Acceptance'
                };
                updatedQuotes = [...rfq.quotes, newQuote];
            }

            const updatedRfqData = {
                quotes: updatedQuotes,
                status: 'Quotation in Progress' as RFQStatus,
            };

            const docRef = doc(db, "rfqs", rfq.id);
            await updateDoc(docRef, updatedRfqData);

            const updatedRfq = { ...rfq, ...updatedRfqData };
            setRfq(updatedRfq);

            // Notify the sales creator
            createNotification({
                recipientId: rfq.creatorId,
                titleKey: isUpdate ? 'notification_quote_updated_title' : 'notification_new_quote_title',
                bodyKey: isUpdate ? 'notification_quote_updated_body' : 'notification_new_quote_body',
                bodyParams: { purchaserName: user.name, rfqCode: rfq.code },
                href: `/dashboard/rfq/${rfq.id}`,
            });

            toast({
                title: isUpdate ? "Quote Updated" : "Quote Submitted",
                description: `Your quote for product ${rfq.products.find(p => p.id === productId)?.sku} has been saved.`,
            });
        } catch (error) {
            console.error("Error submitting quote: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit the quote.' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!rfq) {
        return null;
    }

    const isUserAssigned = rfq.assignedPurchaserIds.includes(user?.id || '');
    
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        {t('rfq_detail_title')} {rfq.code}
                        <Badge variant={getStatusVariant(rfq.status)}>{t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}</Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        {t('field_label_inquiry_time')}: {new Date(rfq.inquiryTime.seconds * 1000).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {rfq.products.map(product => {
                        const productQuotes = rfq.quotes.filter(q => q.productId === product.id);
                        const userQuote = productQuotes.find(q => q.purchaserId === user?.id);
                        const acceptedQuote = productQuotes.find(q => q.status === 'Accepted');
                        const canSalesAccept = user?.role === 'Sales' && !acceptedQuote && productQuotes.length > 0;
                        
                        return (
                            <Card key={product.id}>
                                <CardHeader>
                                    <CardTitle>{product.sku || 'N/A'}</CardTitle>
                                    <CardDescription>WLID: {product.wlid}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                                        {/* Product details */}
                                    </div>
                                    <Separator />
                                    <div className="mt-4">
                                        <h4 className="font-semibold mb-2">Quotes</h4>
                                        {productQuotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes submitted yet.</p>}
                                        <div className="space-y-4">
                                            {productQuotes.map(quote => (
                                                <div key={quote.purchaserId} className={`flex items-center justify-between p-3 rounded-lg ${quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted/50'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={getPurchaser(quote.purchaserId)?.avatar} />
                                                            <AvatarFallback>{getPurchaser(quote.purchaserId)?.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold">{getPurchaser(quote.purchaserId)?.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Quoted on: {new Date(quote.quoteTime).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold">${quote.price.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Delivery: {new Date(quote.deliveryDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    {canSalesAccept && (
                                                        <Button size="sm" variant="outline" onClick={() => handleAcceptQuote(product.id, quote.purchaserId)}>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Accept
                                                        </Button>
                                                    )}
                                                    {quote.status === 'Accepted' && <Badge variant="default" className="bg-green-500">Accepted</Badge>}
                                                    {quote.status === 'Rejected' && <Badge variant="destructive">Rejected</Badge>}
                                                </div>
                                            ))}
                                        </div>
                                        {user?.role === 'Purchasing' && isUserAssigned && !acceptedQuote && (
                                            <QuoteDialog 
                                                product={product}
                                                userQuote={userQuote}
                                                onQuoteSubmit={handleQuoteSubmit}
                                            >
                                                <Button className="mt-4 w-full" variant={userQuote ? 'outline' : 'default'}>
                                                    {userQuote ? <><Edit className="mr-2 h-4 w-4" /> Edit Your Quote</> : <><Send className="mr-2 h-4 w-4" /> Submit Your Quote</>}
                                                </Button>
                                            </QuoteDialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer & Creator</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm">Customer</h4>
                                <p className="text-sm text-muted-foreground">{rfq.customerEmail}</p>
                                <Badge variant="outline" className="mt-1">{rfq.customerType}</Badge>
                            </div>
                            <Separator />
                            {creator && (
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={creator.avatar} />
                                        <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{creator.name}</p>
                                        <p className="text-xs text-muted-foreground">{creator.role}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Assigned Purchasers</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {rfq.assignedPurchaserIds.map(id => {
                                const pUser = getPurchaser(id);
                                if (!pUser) return null;
                                return (
                                    <div key={id} className="flex items-center gap-3">
                                         <Avatar className="h-8 w-8">
                                            <AvatarImage src={pUser.avatar} />
                                            <AvatarFallback>{pUser.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm">{pUser.name}</p>
                                            <p className="text-xs text-muted-foreground">{pUser.email}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}