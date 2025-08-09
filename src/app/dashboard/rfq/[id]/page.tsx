
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, MessageSquare, Paperclip, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_RFQS, MOCK_USERS } from '@/lib/data';
import type { RFQ, RFQStatus, Product, Quote, User } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

export default function RFQDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useI18n();
    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [creator, setCreator] = useState<User | null>(null);

    useEffect(() => {
        if (params.id) {
            const foundRfq = MOCK_RFQS.find(r => r.id === params.id);
            if (foundRfq) {
                setRfq(foundRfq);
                const foundCreator = MOCK_USERS.find(u => u.id === foundRfq.creatorId);
                setCreator(foundCreator || null);
            } else {
                // Handle RFQ not found, maybe redirect or show a message
            }
        }
    }, [params.id]);
    
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

    const canEdit = user.role === 'Admin' || user.id === rfq.creatorId;

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
                                <ProductDetails key={product.id} product={product} rfq={rfq} />
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

function ProductDetails({ product, rfq }: { product: Product, rfq: RFQ }) {
    const { t } = useI18n();
    const quotesForProduct = rfq.quotes.filter(q => q.productId === product.id);

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold">{product.productSeries} - {product.sku}</h3>
                    <p className="text-sm text-muted-foreground">WLID: {product.wlid}</p>
                </div>
                {quotesForProduct.length > 0 && <Badge variant="default">Quoted</Badge>}
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
            
            <QuoteSection quotes={quotesForProduct} />
        </div>
    )
}

function QuoteSection({ quotes }: { quotes: Quote[] }) {
    const { user } = useAuth();
    const { t } = useI18n();
    
    if (user?.role !== 'Purchasing' && quotes.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Waiting for quotations from purchasing department.</p>;
    }

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm">Quotations</h4>
            {quotes.map(quote => (
                 <div key={quote.purchaserId} className="bg-muted/50 p-3 rounded-md text-sm">
                    <div className="flex justify-between">
                       <span>Quoted by: {MOCK_USERS.find(u => u.id === quote.purchaserId)?.name}</span>
                       <span className="font-bold text-primary">${quote.price.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                       Delivery: {new Date(quote.deliveryDate).toLocaleDateString()} | Quoted on: {new Date(quote.quoteTime).toLocaleDateString()}
                    </div>
                 </div>
            ))}
            {user?.role === 'Purchasing' && (
                <Card className="bg-transparent shadow-none border-dashed">
                    <CardContent className="p-4">
                        <h5 className="font-semibold mb-2 text-center">Submit Your Quote</h5>
                        <form className="space-y-2">
                             {/* Form fields for price and delivery would go here */}
                             <Button className="w-full">Submit Quote</Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
