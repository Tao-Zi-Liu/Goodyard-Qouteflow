
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, MessageSquare, Paperclip, Send, CheckCircle, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_RFQS, MOCK_USERS } from '@/lib/data';
import type { RFQ, RFQStatus, Product, Quote, User, QuoteStatus } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';


export default function RFQDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const { createNotification } = useNotifications();

    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [creator, setCreator] = useState<User | null>(null);

    useEffect(() => {
        if (params.id) {
            // In a real app, you'd fetch this data. Here, we're finding it in the mock data.
            // A deep copy is needed to prevent direct mutation of mock data.
            const foundRfq = MOCK_RFQS.find(r => r.id === params.id);
            if (foundRfq) {
                setRfq(JSON.parse(JSON.stringify(foundRfq)));
                const foundCreator = MOCK_USERS.find(u => u.id === foundRfq.creatorId);
                setCreator(foundCreator || null);
            } else {
                // Handle RFQ not found
            }
        }
    }, [params.id]);

    const handleAcceptQuote = (productId: string, purchaserId: string) => {
        if (!rfq) return;

        const updatedRfq = { ...rfq };
        
        // Find the accepted quote and update its status
        const quoteIndex = updatedRfq.quotes.findIndex(q => q.productId === productId && q.purchaserId === purchaserId);
        if (quoteIndex > -1) {
            updatedRfq.quotes[quoteIndex].status = 'Accepted';
        }

        // Mark all other quotes for the same product as no longer primary
        updatedRfq.quotes.forEach((quote, index) => {
            if (quote.productId === productId && index !== quoteIndex) {
                 // Optionally, you could add another status like 'Not Accepted'
            }
        });
        
        updatedRfq.status = 'Quotation Completed';

        setRfq(updatedRfq);
        
        toast({
            title: "Quote Accepted",
            description: "The quote has been accepted and the RFQ is now completed.",
        });

        // Here you would typically save the updated RFQ to your backend.
        // For this mock, we are just updating the local state.
    };
    
    const handleQuoteSubmit = (productId: string, price: number, deliveryDate: Date, existingQuote?: Quote) => {
        if (!rfq || !user) return;
        
        const updatedRfq = {...rfq};
        const isUpdate = !!existingQuote;

        if (existingQuote) {
             const existingQuoteIndex = updatedRfq.quotes.findIndex(q => q.productId === productId && q.purchaserId === user.id);
             if (existingQuoteIndex > -1) {
                const quoteToUpdate = updatedRfq.quotes[existingQuoteIndex];
                quoteToUpdate.price = price;
                quoteToUpdate.deliveryDate = deliveryDate.toISOString();
                toast({ title: "Quote Updated", description: "Your quote has been successfully updated."});
             }
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
            updatedRfq.quotes.push(newQuote);
            toast({ title: "Quote Submitted", description: "Your quote has been successfully submitted."});
        }
        
        updatedRfq.status = 'Quotation in Progress';
        setRfq(updatedRfq);

        // Create notification for the salesperson
        createNotification({
            recipientId: rfq.creatorId,
            titleKey: isUpdate ? 'notification_quote_updated_title' : 'notification_quote_submitted_title',
            bodyKey: isUpdate ? 'notification_quote_updated_body' : 'notification_quote_submitted_body',
            bodyParams: { rfqCode: rfq.code, purchaserName: user.name },
            href: `/dashboard/rfq/${rfq.id}`,
        });
    };


    const getStatusVariant = (status: RFQStatus) => {
        switch (status) {
            case 'Waiting for Quote': return 'secondary';
            case 'Quotation in Progress': return 'default';
            case 'Quotation Completed': return 'outline';
            case 'Archived': return 'destructive';
            default: return 'secondary';
        }
    };
    
    const getPurchaserName = (id: string) => MOCK_USERS.find(u => u.id === id)?.name || 'Unknown';

    if (!rfq || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    const canEdit = user.role === 'Admin' || (user.id === rfq.creatorId && rfq.status !== 'Quotation Completed');

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">RFQ {rfq.code}</h1>
                        <Badge variant={getStatusVariant(rfq.status)}>{t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                        Created on {new Date(rfq.inquiryTime).toLocaleDateString()} by {creator?.name}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    {canEdit && <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    {user.role === 'Admin' && <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Archive</Button>}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Products</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rfq.products.map(product => (
                                <ProductDetails 
                                    key={product.id} 
                                    product={product} 
                                    rfq={rfq} 
                                    onAcceptQuote={handleAcceptQuote} 
                                    onQuoteSubmit={handleQuoteSubmit}
                                />
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Internal Communication</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <Avatar>
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-2">
                                        <Textarea placeholder="Type your message here..." />
                                        <div className="flex justify-between items-center">
                                            <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
                                            <Button>Send <Send className="ml-2 h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Type</span>
                                <span>{rfq.customerType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Email</span>
                                <span>{rfq.customerEmail}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Purchasers</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {rfq.assignedPurchaserIds.map(id => (
                                <div key={id} className="flex items-center gap-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={MOCK_USERS.find(u=>u.id === id)?.avatar} />
                                        <AvatarFallback>{getPurchaserName(id).charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{getPurchaserName(id)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ProductDetails({ product, rfq, onAcceptQuote, onQuoteSubmit }: { product: Product, rfq: RFQ, onAcceptQuote: (productId: string, purchaserId: string) => void, onQuoteSubmit: (productId: string, price: number, deliveryDate: Date, existingQuote?: Quote) => void }) {
    const { user } = useAuth();
    const { t } = useI18n();
    const quotesForProduct = rfq.quotes.filter(q => q.productId === product.id);
    const isQuotedByCurrentUser = user && rfq.assignedPurchaserIds.includes(user.id) && quotesForProduct.some(q => q.purchaserId === user.id);
    const isProductAccepted = quotesForProduct.some(q => q.status === 'Accepted');

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold">{product.productSeries} - {product.sku}</h3>
                    <p className="text-sm text-muted-foreground">WLID: {product.wlid}</p>
                </div>
                 {isProductAccepted ? <Badge variant="default" className="bg-green-600">Accepted</Badge> : (quotesForProduct.length > 0 && <Badge variant="default">Quoted</Badge>)}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Hair Fiber:</span> {product.hairFiber}</div>
                <div><span className="font-medium text-muted-foreground">Cap:</span> {product.cap}</div>
                <div><span className="font-medium text-muted-foreground">Cap Size:</span> {product.capSize}</div>
                <div><span className="font-medium text-muted-foreground">Length:</span> {product.length}</div>
                <div><span className="font-medium text-muted-foreground">Density:</span> {product.density}</div>
                <div><span className="font-medium text-muted-foreground">Color:</span> {product.color}</div>
                <div><span className="font-medium text-muted-foreground">Curls:</span> {product.curlStyle}</div>
            </div>

            {product.imagePreviews && product.imagePreviews.length > 0 && (
                <div>
                    <p className="font-medium text-sm mb-2">Images</p>
                    <div className="flex gap-2 overflow-x-auto">
                        {product.imagePreviews.map((src, index) => (
                            <Image key={index} src={src} alt={`Product image ${index + 1}`} width={100} height={100} className="rounded-md object-cover" />
                        ))}
                    </div>
                </div>
            )}
            
            <Separator />
            
            <QuoteSection 
                quotes={quotesForProduct}
                productId={product.id}
                onAcceptQuote={(purchaserId) => onAcceptQuote(product.id, purchaserId)}
                onQuoteSubmit={onQuoteSubmit}
                isProductAccepted={isProductAccepted}
                isQuotedByCurrentUser={isQuotedByCurrentUser}
                rfqStatus={rfq.status}
            />
        </div>
    )
}

function QuoteSection({ quotes, productId, onAcceptQuote, onQuoteSubmit, isProductAccepted, isQuotedByCurrentUser, rfqStatus }: { quotes: Quote[], productId: string, onAcceptQuote: (purchaserId: string) => void, onQuoteSubmit: (productId: string, price: number, deliveryDate: Date, existingQuote?: Quote) => void, isProductAccepted: boolean, isQuotedByCurrentUser: boolean, rfqStatus: RFQStatus }) {
    const { user } = useAuth();
    const { t } = useI18n();

    const getStatusBadge = (status: QuoteStatus) => {
        if (status === 'Accepted') {
            return <Badge variant="default" className="bg-green-600">Accepted</Badge>
        }
        return <Badge variant="secondary">Pending</Badge>
    }
    
    if (user?.role !== 'Purchasing' && quotes.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Waiting for quotations from purchasing department.</p>;
    }
    
    const canSubmitQuote = user?.role === 'Purchasing' && !isQuotedByCurrentUser && !isProductAccepted;

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm">Quotations</h4>
            {quotes.map(quote => (
                 <div key={quote.purchaserId} className={`p-3 rounded-md text-sm ${quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50 border border-green-500' : 'bg-muted/50'}`}>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2">
                            <span>Quoted by: {MOCK_USERS.find(u => u.id === quote.purchaserId)?.name}</span>
                            {getStatusBadge(quote.status)}
                       </div>
                       <div className="flex items-center gap-2">
                           <span className="font-bold text-primary">${quote.price.toFixed(2)}</span>
                           {user?.id === quote.purchaserId && quote.status === 'Pending Acceptance' && !isProductAccepted && (
                               <QuoteForm
                                   trigger={<Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-4 w-4"/></Button>}
                                   productId={productId}
                                   onSubmit={onQuoteSubmit}
                                   existingQuote={quote}
                               />
                           )}
                       </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                       Delivery: {new Date(quote.deliveryDate).toLocaleDateString()} | Quoted on: {new Date(quote.quoteTime).toLocaleDateString()}
                    </div>
                    {user?.role === 'Sales' && quote.status === 'Pending Acceptance' && rfqStatus !== 'Quotation Completed' && (
                        <div className="text-right mt-2">
                            <Button size="sm" onClick={() => onAcceptQuote(quote.purchaserId)}>
                                <CheckCircle className="mr-2 h-4 w-4"/> Accept Quote
                            </Button>
                        </div>
                    )}
                 </div>
            ))}
            {canSubmitQuote && (
                <Card className="bg-transparent shadow-none border-dashed">
                    <CardContent className="p-4">
                        <h5 className="font-semibold mb-2 text-center">Submit Your Quote</h5>
                        <QuoteForm
                           trigger={<Button className="w-full">Submit Quote</Button>}
                           productId={productId}
                           onSubmit={onQuoteSubmit}
                       />
                    </CardContent>
                </Card>
            )}
             {user?.role === 'Purchasing' && isProductAccepted && (
                 <p className="text-sm text-muted-foreground text-center py-4">A quote for this product has been accepted. No further quotes can be submitted.</p>
             )}
        </div>
    )
}

function QuoteForm({ trigger, productId, onSubmit, existingQuote }: { trigger: React.ReactNode, productId: string, onSubmit: (productId: string, price: number, deliveryDate: Date, existingQuote?: Quote) => void, existingQuote?: Quote }) {
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState(existingQuote?.price || '');
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(existingQuote ? new Date(existingQuote.deliveryDate) : undefined);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (price && deliveryDate) {
            onSubmit(productId, Number(price), deliveryDate, existingQuote);
            setOpen(false);
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent className="w-80">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">{existingQuote ? 'Edit Quote' : 'Submit Quote'}</h4>
                        <p className="text-sm text-muted-foreground">
                            Enter the price and estimated delivery date.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="price">Price</Label>
                            <Input
                                id="price"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="col-span-2 h-8"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="deliveryDate">Delivery</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "col-span-2 h-8 justify-start text-left font-normal",
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
                    <Button type="submit">{existingQuote ? 'Update' : 'Submit'}</Button>
                </form>
            </PopoverContent>
        </Popover>
    );
}
